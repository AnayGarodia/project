import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post("/api/ai", async (req, res) => {
  try {
    const { input, task } = req.body;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: `${task}\n\nInput:\n${input}` }],
      temperature: 0.3,
    });

    const text = completion?.choices?.[0]?.message?.content || "";
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log("AI API running on http://localhost:3001");
});
