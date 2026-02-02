// workflowEngine.js - IMPROVED VERSION
// Handles workflow execution with better error handling and smoother user experience

export class WorkflowExecutor {
  constructor() {
    this.inputData = {};
    this.variables = {};
    this.output = [];
    this.gmailConnected = false;
    this.onOutput = null;
    this.onGmailRequired = null;
  }

  setInputData(data) {
    this.inputData = data;
    this.variables = { ...data };
  }

  setGmailStatus(connected) {
    this.gmailConnected = connected;
  }

  setGmailRequiredCallback(callback) {
    this.onGmailRequired = callback;
  }

  // Add output with detailed information
  addOutput(type, content, metadata = {}) {
    const outputItem = {
      type,
      content,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    this.output.push(outputItem);

    // Call the callback if it exists
    if (this.onOutput) {
      this.onOutput([...this.output]);
    }

    // Also log to console for debugging
    console.log(`[${type.toUpperCase()}]`, content);

    return outputItem;
  }

  // Check Gmail connection before Gmail operations
  async ensureGmailConnected() {
    if (!this.gmailConnected) {
      this.addOutput("warning", "  Gmail connection required");

      if (this.onGmailRequired) {
        // Trigger the Gmail connection prompt
        await this.onGmailRequired();

        // Wait for connection (with timeout)
        const maxWait = 30000; // 30 seconds
        const startTime = Date.now();

        while (!this.gmailConnected && Date.now() - startTime < maxWait) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        if (!this.gmailConnected) {
          throw new Error(
            "Gmail connection timeout - please connect your Gmail account"
          );
        }
      } else {
        throw new Error(
          "Gmail not connected - please connect your Gmail account"
        );
      }
    }
  }

  // Check Gmail connection status
  async checkGmailConnection() {
    try {
      const response = await fetch("http://localhost:3001/api/gmail/status");
      const data = await response.json();
      this.gmailConnected = data.connected;
      return data.connected;
    } catch (err) {
      console.error("Error checking Gmail status:", err);
      return false;
    }
  }

  // Fetch unread emails with detailed output
  async fetchUnreadEmails() {
    await this.ensureGmailConnected();

    this.addOutput("log", " Fetching unread emails...");

    try {
      const response = await fetch("http://localhost:3001/api/emails/unread");
      const data = await response.json();

      if (data.emails && data.emails.length > 0) {
        this.addOutput(
          "success",
          ` Found ${data.emails.length} unread email(s)`,
          {
            count: data.emails.length,
          }
        );

        // Show preview of each email
        data.emails.forEach((email, index) => {
          this.addOutput(
            "email-preview",
            `Email ${index + 1}:\n  From: ${email.from}\n  Subject: ${
              email.subject
            }\n  Preview: ${(email.snippet || email.body).substring(
              0,
              100
            )}...`,
            { emailData: email }
          );
        });

        return data.emails;
      } else {
        this.addOutput("info", " No unread emails found");
        return [];
      }
    } catch (err) {
      this.addOutput("error", ` Failed to fetch emails: ${err.message}`);
      throw err;
    }
  }

  // Generate AI reply with detailed output
  async generateAIReply(emailBody, task, subject, from) {
    this.addOutput("log", ` Generating AI reply for email from ${from}...`);

    try {
      const response = await fetch("http://localhost:3001/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailBody,
          task: task || "Draft a professional, helpful email response",
          subject,
          from,
        }),
      });

      const data = await response.json();

      if (response.ok && data.text) {
        this.addOutput(
          "ai-generated",
          ` AI Reply Generated (${data.text.length} chars):\n\n${data.text}`,
          {
            replyText: data.text,
            length: data.text.length,
            groqApiCalls: data.groqApiCalls,
          }
        );

        return data.text;
      } else {
        this.addOutput("error", ` AI generation failed: ${data.error}`);
        throw new Error(data.error || "AI generation failed");
      }
    } catch (err) {
      this.addOutput("error", ` AI generation error: ${err.message}`);
      throw err;
    }
  }

  // Send email reply with detailed output
  async sendEmailReply(emailId, replyBody, subject, to, threadId) {
    await this.ensureGmailConnected();

    this.addOutput("log", ` Sending reply to ${to}...`);

    // Show what we're sending
    this.addOutput(
      "email-sending",
      ` Email Details:\n  To: ${to}\n  Subject: Re: ${subject}\n  Length: ${
        replyBody.length
      } chars\n\nBody preview:\n${replyBody.substring(0, 200)}...`,
      {
        to,
        subject: `Re: ${subject}`,
        body: replyBody,
        bodyLength: replyBody.length,
      }
    );

    try {
      const response = await fetch("http://localhost:3001/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId,
          replyBody,
          subject,
          to,
          threadId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.testMode) {
          this.addOutput(
            "test-mode",
            ` TEST MODE: Email validated but NOT sent\n\nThis email would have been sent to: ${data.emailDetails?.to}`,
            { emailDetails: data.emailDetails }
          );
        } else {
          this.addOutput(
            "email-sent",
            ` Email sent successfully!\n  To: ${data.emailDetails?.to}\n  Message ID: ${data.messageId}`,
            {
              messageId: data.messageId,
              emailDetails: data.emailDetails,
            }
          );
        }

        return data;
      } else {
        this.addOutput("error", ` Failed to send email: ${data.error}`);
        throw new Error(data.error || "Send failed");
      }
    } catch (err) {
      this.addOutput("error", ` Send error: ${err.message}`);
      throw err;
    }
  }

  // Mark email as read
  async markEmailAsRead(emailId) {
    await this.ensureGmailConnected();

    try {
      const response = await fetch(
        "http://localhost:3001/api/emails/markread",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailId }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        this.addOutput("log", ` Email marked as read`);
        return true;
      } else {
        this.addOutput(
          "warning",
          `  Could not mark email as read: ${data.error}`
        );
        return false;
      }
    } catch (err) {
      this.addOutput("warning", `  Mark as read error: ${err.message}`);
      return false;
    }
  }

  // Call AI for analysis/generation (non-Gmail)
  async callAI(input, task) {
    this.addOutput("log", ` Calling AI: ${task.substring(0, 60)}...`);

    try {
      const response = await fetch("http://localhost:3001/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, task }),
      });

      const data = await response.json();

      if (response.ok && data.text) {
        this.addOutput("ai-result", ` AI Result:\n${data.text}`, {
          result: data.text,
        });
        return data.text;
      } else {
        this.addOutput("error", ` AI call failed: ${data.error}`);
        throw new Error(data.error || "AI call failed");
      }
    } catch (err) {
      this.addOutput("error", ` AI error: ${err.message}`);
      throw err;
    }
  }

  // Execute the generated code
  async execute(code, onOutputCallback) {
    this.output = [];
    this.onOutput = onOutputCallback;

    this.addOutput("log", " Starting workflow execution...");

    try {
      // Check Gmail status at start
      await this.checkGmailConnection();

      // Create execution context with improved error handling
      const context = {
        // Input data
        inputData: this.variables,

        // Output functions
        output: (message) => this.addOutput("result", String(message)),
        log: (message) => this.addOutput("log", String(message)),

        // Gmail functions
        fetchEmails: async () => {
          try {
            return await this.fetchUnreadEmails();
          } catch (err) {
            this.addOutput("error", `fetchEmails failed: ${err.message}`);
            return [];
          }
        },

        generateReply: async (body, task, subject, from) => {
          try {
            return await this.generateAIReply(body, task, subject, from);
          } catch (err) {
            this.addOutput("error", `generateReply failed: ${err.message}`);
            return "";
          }
        },

        sendReply: async (emailId, replyBody, subject, to, threadId) => {
          try {
            return await this.sendEmailReply(
              emailId,
              replyBody,
              subject,
              to,
              threadId
            );
          } catch (err) {
            this.addOutput("error", `sendReply failed: ${err.message}`);
            throw err;
          }
        },

        markRead: async (emailId) => {
          try {
            return await this.markEmailAsRead(emailId);
          } catch (err) {
            this.addOutput("warning", `markRead failed: ${err.message}`);
            return false;
          }
        },

        // AI functions
        callAI: async (input, task) => {
          try {
            return await this.callAI(input, task);
          } catch (err) {
            this.addOutput("error", `AI call failed: ${err.message}`);
            return "";
          }
        },

        // Variable functions
        setVariable: (name, value) => {
          this.variables[name] = value;
          this.addOutput("log", ` Variable set: ${name}`);
        },

        getVariable: (name) => {
          return this.variables[name];
        },
      };

      // Execute the code with better error context
      const AsyncFunction = Object.getPrototypeOf(
        async function () {}
      ).constructor;

      // Wrap code in try-catch for better error reporting
      const wrappedCode = `
try {
${code}
} catch (error) {
  context.log(" Error in workflow: " + error.message);
  throw error;
}
`;

      const executor = new AsyncFunction("context", wrappedCode);

      await executor(context);

      this.addOutput("success", " Workflow completed successfully!");

      return {
        success: true,
        output: this.output,
        message: "Workflow completed",
      };
    } catch (error) {
      this.addOutput("error", ` Execution error: ${error.message}`);

      // Add stack trace for debugging
      if (error.stack) {
        console.error("Full error stack:", error.stack);
      }

      return {
        success: false,
        error: error.message,
        output: this.output,
        message: "Workflow failed",
      };
    }
  }
}

// Sample data for testing
export const sampleData = {
  customerEmail: `Hi Support Team,

I ordered product #12345 last week but haven't received any shipping confirmation. 
Can you please check the status of my order?

Thanks,
John Smith`,

  salesData: `Q4 Sales Report:
Region A: $125,000
Region B: $98,000  
Region C: $156,000
Total: $379,000

Growth: +15% vs Q3`,

  technicalIssue: `System Error Log:
Error: Connection timeout
Timestamp: 2024-01-15 14:30:22
Service: payment-gateway
Severity: HIGH`,
};

// Function to get sample data based on agent type
export function getSampleDataForAgent(agentType) {
  switch (agentType) {
    case "support":
      return { emailBody: sampleData.customerEmail };
    case "sales":
      return { reportData: sampleData.salesData };
    case "data":
      return { logData: sampleData.technicalIssue };
    case "email":
      return {}; // Gmail agents don't need sample data
    default:
      return sampleData;
  }
}

// Workflow templates
export const workflowTemplates = {
  customerSupport: {
    name: "Customer Support Agent",
    description: "Analyzes customer emails and drafts helpful responses",
    agentType: "support",
    requiresGmail: false,
    blocks: [
      "agent_start",
      "input_data",
      "ai_analyze",
      "ai_generate",
      "display_result",
    ],
  },

  salesReport: {
    name: "Sales Report Generator",
    description: "Processes sales data and generates executive summaries",
    agentType: "sales",
    requiresGmail: false,
    blocks: [
      "agent_start",
      "input_data",
      "ai_extract",
      "ai_generate",
      "display_result",
    ],
  },

  gmailAutoReply: {
    name: "Gmail Auto-Reply Agent",
    description: "Fetches unread emails and sends AI-generated replies",
    agentType: "email",
    requiresGmail: true,
    blocks: [
      "agent_start",
      "gmail_fetch_unread",
      "gmail_for_each_email",
      "gmail_get_property",
      "ai_generate",
      "gmail_send_reply",
      "gmail_mark_read",
    ],
  },
};
