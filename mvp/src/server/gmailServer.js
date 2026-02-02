// gmailServer.js
// Gmail + AI Email Agent — FIXED & OPTIMIZED WITH ALL ENDPOINTS

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { google } from "googleapis";
import Groq from "groq-sdk";

dotenv.config();

/* ──────────────────────────── CONFIG ──────────────────────────── */

const TEST_MODE = true;

// 1. CONTROL HOW MANY EMAILS TO FETCH HERE
const MAX_EMAILS_PER_RUN = 10;
const MIN_REPLY_LENGTH = 50;

// 2. ALLOWED USERS (These people will actually receive emails in TEST_MODE)
const ALLOWED_TEST_EMAILS = new Set(
  ["agarodia98@gmail.com"].map((e) => e.toLowerCase()),
  ["sg4647@barnard.edu"].map((e) => e.toLowerCase())
);

const PORT = process.env.PORT || 3001;
const TOKEN_PATH = path.join(process.cwd(), "gmail_tokens.json");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

/* ──────────────────────────── APP ──────────────────────────── */

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));

/* ──────────────────────────── OAUTH ──────────────────────────── */

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI || "http://localhost:3001/api/gmail/callback"
);

// Auto-refresh tokens
oauth2Client.on("tokens", (tokens) => {
  if (fs.existsSync(TOKEN_PATH)) {
    const data = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    const newTokens = { ...data.tokens, ...tokens };
    fs.writeFileSync(
      TOKEN_PATH,
      JSON.stringify({ ...data, tokens: newTokens }, null, 2)
    );
    console.log(" Tokens refreshed and saved.");
  }
});

let currentUserEmail = null;

if (fs.existsSync(TOKEN_PATH)) {
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    oauth2Client.setCredentials(data.tokens);
    currentUserEmail = data.userEmail;
    console.log(` Loaded credentials for: ${currentUserEmail}`);
  } catch (err) {
    console.error(" Error loading token file:", err);
  }
}

const gmail = google.gmail({ version: "v1", auth: oauth2Client });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let groqCalls = 0;
const processedEmails = new Set();

/* ──────────────────────────── HELPERS ──────────────────────────── */

function normalizeEmail(raw) {
  if (!raw) return "";
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

function isAutomatedEmail(from, headers = []) {
  if (!from) return true;
  const f = from.toLowerCase();
  if (f.includes("noreply") || f.includes("no-reply")) return true;
  if (f.includes("newsletter")) return true;
  if (headers.some((h) => h.name === "List-Unsubscribe")) return true;
  return false;
}

function validateReply(body, toEmail) {
  if (!body || typeof body !== "string") {
    throw new Error("Reply body missing or invalid");
  }

  const clean = body.trim();
  if (clean.length < MIN_REPLY_LENGTH) {
    throw new Error(
      `Reply too short (${clean.length} chars). Min: ${MIN_REPLY_LENGTH}`
    );
  }
}

function extractPlainText(payload) {
  if (payload?.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf8");
  }
  if (payload?.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain") {
        return extractPlainText(part);
      }
    }
    for (const part of payload.parts) {
      const text = extractPlainText(part);
      if (text) return text;
    }
  }
  return "";
}

function buildRawEmail({ to, subject, body, inReplyTo }) {
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `MIME-Version: 1.0`,
  ];

  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
    headers.push(`References: ${inReplyTo}`);
  }

  const message = [...headers, "", body].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/* ──────────────────────────── ROUTES ──────────────────────────── */

// AUTH
app.get("/api/gmail/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
  res.redirect(url);
});

app.get("/api/gmail/callback", async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    currentUserEmail = userInfo.data.email;

    fs.writeFileSync(
      TOKEN_PATH,
      JSON.stringify({ tokens, userEmail: currentUserEmail }, null, 2),
      { mode: 0o600 }
    );

    res.send(
      `<h1> Gmail Connected</h1><p>Logged in as: ${currentUserEmail}</p><script>window.close();</script>`
    );
  } catch (error) {
    console.error("Auth Error:", error);
    res.status(500).send("Authentication failed.");
  }
});

// STATUS
app.get("/api/gmail/status", (req, res) => {
  res.json({
    connected: !!oauth2Client.credentials.access_token,
    userEmail: currentUserEmail,
    testMode: TEST_MODE,
    groqCalls,
    maxEmailsPerRun: MAX_EMAILS_PER_RUN,
  });
});

// FETCH UNREAD
app.get("/api/emails/unread", async (req, res) => {
  try {
    if (!oauth2Client.credentials.access_token) {
      return res.status(401).json({ error: "Gmail not connected" });
    }

    const list = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread category:primary -from:me",
      maxResults: MAX_EMAILS_PER_RUN,
    });

    if (!list.data.messages || list.data.messages.length === 0) {
      return res.json({ emails: [] });
    }

    const emails = [];

    for (const msg of list.data.messages) {
      if (processedEmails.has(msg.id)) continue;

      const full = await gmail.users.messages.get({ userId: "me", id: msg.id });
      const payload = full.data.payload;
      const headers = payload.headers || [];
      const from = headers.find((h) => h.name === "From")?.value || "";
      const subject =
        headers.find((h) => h.name === "Subject")?.value || "(No Subject)";
      const messageId =
        headers.find((h) => h.name === "Message-ID")?.value || null;

      if (isAutomatedEmail(from, headers)) continue;

      const body = extractPlainText(payload);
      if (!body) continue;

      emails.push({
        id: msg.id,
        threadId: full.data.threadId,
        messageId,
        from,
        fromEmail: normalizeEmail(from),
        subject,
        body: body.slice(0, 2000),
        snippet: body.slice(0, 200),
      });
    }

    res.json({ emails });
  } catch (error) {
    console.error(" Error fetching emails:", error);
    res.status(500).json({ error: error.message });
  }
});

// AI REPLY (UPDATED TO MATCH WORKFLOWENGINE)
app.post("/api/ai/reply", async (req, res) => {
  try {
    const { emailBody, body, task, subject, from, fromEmail } = req.body;

    // Support both parameter names for backward compatibility
    const emailText = emailBody || body;
    const sender = from || fromEmail || "the sender";

    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY missing");
    }

    const defaultTask = "Draft a professional, helpful email response";
    const aiTask = task || defaultTask;

    const prompt = `
You are a professional email assistant.
${aiTask}

Context:
- Email subject: ${subject || "N/A"}
- From: ${sender}

Incoming Email:
"${emailText}"

Write a concise, natural reply. No subject line, no signature, just the body.
`;

    groqCalls++;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";

    if (!text || text.length < MIN_REPLY_LENGTH) {
      throw new Error(
        `Reply too short (${text.length} chars). Min: ${MIN_REPLY_LENGTH}`
      );
    }

    res.json({
      text,
      groqApiCalls: groqCalls,
      length: text.length,
    });
  } catch (error) {
    console.error(" AI Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// GENERAL AI ENDPOINT (NEW - FOR NON-EMAIL AI CALLS)
app.post("/api/ai", async (req, res) => {
  try {
    const { input, task } = req.body;

    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY missing");
    }

    const prompt = `
${task}

Input:
"${input}"

Provide a clear, concise response.
`;

    groqCalls++;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";

    res.json({
      text,
      groqApiCalls: groqCalls,
    });
  } catch (error) {
    console.error(" AI Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// SEND EMAIL (UPDATED WITH BETTER RESPONSE)
app.post("/api/emails/send", async (req, res) => {
  try {
    const { emailId, threadId, messageId, to, subject, replyBody } = req.body;

    if (processedEmails.has(emailId)) {
      return res.status(409).json({ error: "Email already processed" });
    }

    const toEmail = normalizeEmail(to);
    validateReply(replyBody, toEmail);

    processedEmails.add(emailId);

    // 1. Mark as Read
    await gmail.users.messages.modify({
      userId: "me",
      id: emailId,
      requestBody: { removeLabelIds: ["UNREAD"] },
    });

    // 2. Check if we should send real email
    const isAllowedUser = ALLOWED_TEST_EMAILS.has(toEmail);
    const shouldSendRealEmail = !TEST_MODE || isAllowedUser;

    if (!shouldSendRealEmail) {
      console.log(` TEST MODE BLOCKED: Simulated sending to ${toEmail}`);
      console.log(`   Subject: Re: ${subject}`);
      console.log(`   Body: ${replycdBody.substring(0, 100)}...`);

      return res.json({
        success: true,
        testMode: true,
        emailDetails: {
          to: toEmail,
          subject: `Re: ${subject.replace(/^Re:\s*/i, "")}`,
          body: replyBody,
        },
      });
    }

    // 3. Build & Send Real Email
    const raw = buildRawEmail({
      to: toEmail,
      subject: `Re: ${subject.replace(/^Re:\s*/i, "")}`,
      body: replyBody,
      inReplyTo: messageId,
    });

    const sent = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw, threadId },
    });

    console.log(` REAL EMAIL SENT to ${toEmail}`);

    res.json({
      success: true,
      id: sent.data.id,
      messageId: sent.data.id,
      emailDetails: {
        to: toEmail,
        subject: `Re: ${subject.replace(/^Re:\s*/i, "")}`,
        body: replyBody,
      },
    });
  } catch (error) {
    console.error(" Send Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// MARK AS READ (NEW ENDPOINT)
app.post("/api/emails/markread", async (req, res) => {
  try {
    const { emailId } = req.body;

    if (!oauth2Client.credentials.access_token) {
      return res.status(401).json({ error: "Gmail not connected" });
    }

    await gmail.users.messages.modify({
      userId: "me",
      id: emailId,
      requestBody: { removeLabelIds: ["UNREAD"] },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(" Mark Read Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/* ──────────────────────────── START ──────────────────────────── */

app.listen(PORT, () => {
  console.log(` Gmail AI Agent running on http://localhost:${PORT}`);
  console.log(` TEST MODE: ${TEST_MODE ? "ON" : "OFF"}`);
  console.log(` Max Emails Per Run: ${MAX_EMAILS_PER_RUN}`);
  console.log(
    ` Allowed Test User: ${Array.from(ALLOWED_TEST_EMAILS).join(", ")}`
  );
  console.log(`\n Connect Gmail: http://localhost:${PORT}/api/gmail/auth`);
});
