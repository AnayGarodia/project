import React, { useState, useEffect, useRef } from "react";
import * as Blockly from "blockly";
import { javascriptGenerator } from "blockly/javascript";
import {
  WorkflowExecutor,
  sampleData,
  workflowTemplates,
} from "../pages/workflowEngine";
import "./Builder.css";

// Import custom blocks
import "./customBlocks";

// --------------------
// Enhanced Builder Component
// --------------------
export default function Builder() {
  const blocklyDiv = useRef(null);
  const workspace = useRef(null);
  const executor = useRef(new WorkflowExecutor());

  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailUserEmail, setGmailUserEmail] = useState(null);
  const [gmailTestMode, setGmailTestMode] = useState(true);
  const [groqApiCalls, setGroqApiCalls] = useState(0);
  const [showGmailPrompt, setShowGmailPrompt] = useState(false);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // ---------------- Check Gmail connection ----------------
  useEffect(() => {
    checkGmailStatus();

    // Set up the Gmail required callback
    executor.current.setGmailRequiredCallback(handleGmailRequired);
  }, []);

  const checkGmailStatus = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/gmail/status");
      const data = await response.json();
      setGmailConnected(data.connected);
      setGmailUserEmail(data.userEmail);
      setGmailTestMode(data.testMode ?? true);
      setGroqApiCalls(data.groqApiCalls || 0);

      // Update executor status
      executor.current.setGmailStatus(data.connected);
    } catch (err) {
      console.error("Error checking Gmail status:", err);
      setGmailConnected(false);
      setGmailUserEmail(null);
      setGmailTestMode(true);
      executor.current.setGmailStatus(false);
    }
  };

  // Handle when Gmail is required during execution
  const handleGmailRequired = async () => {
    return new Promise((resolve) => {
      setShowGmailPrompt(true);

      // Set up a polling interval to check if connected
      const checkInterval = setInterval(async () => {
        const response = await fetch("http://localhost:3001/api/gmail/status");
        const data = await response.json();

        if (data.connected) {
          setGmailConnected(true);
          setGmailUserEmail(data.userEmail);
          executor.current.setGmailStatus(true);
          setShowGmailPrompt(false);
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 1000);

      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 60000);
    });
  };

  // ---------------- Blockly init ----------------
  useEffect(() => {
    if (blocklyDiv.current && !workspace.current) {
      workspace.current = Blockly.inject(blocklyDiv.current, {
        toolbox: {
          kind: "categoryToolbox",
          contents: [
            {
              kind: "category",
              name: "Control",
              colour: "#7c3aed",
              contents: [
                { kind: "block", type: "agent_start" },
                { kind: "block", type: "if_contains" },
              ],
            },
            {
              kind: "category",
              name: "Input",
              colour: "#f59e0b",
              contents: [{ kind: "block", type: "input_data" }],
            },
            {
              kind: "category",
              name: "Gmail",
              colour: "#3b82f6",
              contents: [
                { kind: "block", type: "gmail_fetch_unread" },
                { kind: "block", type: "gmail_for_each_email" },
                { kind: "block", type: "gmail_get_property" },
                { kind: "block", type: "gmail_send_reply" },
                { kind: "block", type: "gmail_mark_read" },
              ],
            },
            {
              kind: "category",
              name: "AI",
              colour: "#10b981",
              contents: [
                { kind: "block", type: "ai_analyze" },
                { kind: "block", type: "ai_generate" },
                { kind: "block", type: "ai_extract" },
              ],
            },
            {
              kind: "category",
              name: "Data",
              colour: "#6b7280",
              contents: [
                { kind: "block", type: "simple_text" },
                { kind: "block", type: "get_variable" },
                { kind: "block", type: "combine_text" },
              ],
            },
            {
              kind: "category",
              name: "Output",
              colour: "#ec4899",
              contents: [
                { kind: "block", type: "display_result" },
                { kind: "block", type: "log_message" },
              ],
            },
          ],
        },
        grid: { spacing: 20, length: 1, colour: "#f0f0f0", snap: true },
        zoom: { controls: true, wheel: true, startScale: 1.0 },
        trashcan: true,
      });

      const startBlock = workspace.current.newBlock("agent_start");
      startBlock.initSvg();
      startBlock.render();
      startBlock.moveBy(40, 40);
    }

    return () => {
      if (workspace.current) {
        workspace.current.dispose();
        workspace.current = null;
      }
    };
  }, []);

  // ---------------- Templates ----------------
  const loadTemplate = async (templateKey) => {
    if (!workspace.current) return;

    const template = workflowTemplates[templateKey];
    if (!template) return;

    workspace.current.clear();

    const start = workspace.current.newBlock("agent_start");
    start.initSvg();
    start.render();
    start.moveBy(40, 40);

    if (template.agentType) {
      start.setFieldValue(template.agentType, "AGENT_TYPE");
    }

    console.log(`Loaded template: ${template.name}`);
  };

  // ---------------- Connect Gmail ----------------
  const connectGmail = () => {
    const authWindow = window.open(
      "http://localhost:3001/api/gmail/auth",
      "_blank",
      "width=600,height=700"
    );

    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:3001/api/gmail/status");
        const data = await response.json();

        if (data.connected) {
          setGmailConnected(true);
          setGmailUserEmail(data.userEmail);
          setGmailTestMode(data.testMode ?? true);
          executor.current.setGmailStatus(true);
          setShowGmailPrompt(false);
          setShowAccountManager(false);
          clearInterval(checkInterval);

          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }

          alert(
            ` Gmail connected!\nAccount: ${data.userEmail}${
              data.testMode
                ? "\n\n TEST MODE: Emails will be validated but NOT sent"
                : ""
            }`
          );
        }
      } catch (err) {
        console.error("Error checking connection:", err);
      }
    }, 2000);

    setTimeout(() => clearInterval(checkInterval), 120000);
  };

  // ---------------- Disconnect Gmail ----------------
  const disconnectGmail = async () => {
    try {
      const response = await fetch(
        "http://localhost:3001/api/gmail/disconnect",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (data.success) {
        setGmailConnected(false);
        setGmailUserEmail(null);
        executor.current.setGmailStatus(false);
        setShowAccountManager(false);
        setShowDisconnectConfirm(false);
        alert(" Gmail disconnected!");
      }
    } catch (err) {
      console.error("Error disconnecting Gmail:", err);
      alert(" Failed to disconnect Gmail");
    }
  };

  // ---------------- Run workflow ----------------
  const runWorkflow = async () => {
    if (!workspace.current) return;

    // Note: We don't check for Gmail here - let the workflow engine handle it
    // This allows automatic prompting when Gmail blocks are actually executed

    setIsRunning(true);
    setOutput([]);
    setShowOutput(true);

    try {
      const code = javascriptGenerator.workspaceToCode(workspace.current);
      console.log("Generated code:", code);

      const blocks = workspace.current.getAllBlocks();
      if (blocks.length === 0) {
        setOutput([
          {
            type: "error",
            content: "No blocks in workspace",
            timestamp: new Date().toISOString(),
          },
        ]);
        setIsRunning(false);
        return;
      }

      const startBlock = blocks.find((b) => b.type === "agent_start");
      const agentType = startBlock?.getFieldValue("AGENT_TYPE") || "support";

      console.log("Agent type:", agentType);

      executor.current.setInputData(sampleData);

      // Execute with live output updates
      const result = await executor.current.execute(code, (outputs) => {
        setOutput([...outputs]);

        // Update Groq API call count if available
        const lastOutput = outputs[outputs.length - 1];
        if (lastOutput?.metadata?.groqApiCalls) {
          setGroqApiCalls(lastOutput.metadata.groqApiCalls);
        }
      });

      setOutput(result.output);

      // Refresh Gmail status
      await checkGmailStatus();
    } catch (error) {
      console.error("Execution error:", error);
      setOutput((prev) => [
        ...prev,
        {
          type: "error",
          content: `Error: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  // Get appropriate emoji for output type
  const getOutputEmoji = (type) => {
    const emojiMap = {
      log: "",
      success: "",
      error: "",
      warning: "",
      info: "",
      "ai-generated": "",
      "ai-result": "",
      "email-preview": "",
      "email-sending": "",
      "email-sent": "",
      "test-mode": "",
      result: "",
    };
    return emojiMap[type] || "•";
  };

  // ---------------- Render ----------------
  return (
    <div className="builder">
      <div className="builder-header">
        <div className="builder-title">
          <h1>AI Agent Builder</h1>
          <p>Create your workflow with visual blocks</p>
        </div>

        <div className="builder-actions">
          {/* Template Buttons */}
          <button
            onClick={() => loadTemplate("customerSupport")}
            className="btn-secondary"
          >
             Support Agent
          </button>
          <button
            onClick={() => loadTemplate("salesReport")}
            className="btn-secondary"
          >
             Sales Agent
          </button>
          <button
            onClick={() => loadTemplate("gmailAutoReply")}
            className="btn-secondary"
          >
             Gmail Agent
          </button>

          {/* Clear Button */}
          <button
            onClick={() => workspace.current?.clear()}
            className="btn-secondary"
          >
             Clear
          </button>

          {/* Gmail Account Button */}
          {gmailConnected ? (
            <button
              onClick={() => setShowAccountManager(true)}
              className="btn-secondary gmail-connected-btn"
            >
              {gmailTestMode ? "" : ""}{" "}
              {gmailUserEmail?.split("@")[0] || "Gmail"}
            </button>
          ) : (
            <button onClick={connectGmail} className="btn-secondary gmail-btn">
               Connect Gmail
            </button>
          )}

          {/* Run Button */}
          <button
            onClick={runWorkflow}
            disabled={isRunning}
            className="btn-primary"
          >
            {isRunning ? " Running..." : " Run Workflow"}
          </button>
        </div>
      </div>

      {/* Test Mode & API Stats Banner */}
      {(gmailConnected && gmailTestMode) || groqApiCalls > 0 ? (
        <div className="info-banner">
          {gmailConnected && gmailTestMode && (
            <span> TEST MODE: Emails validated but NOT sent</span>
          )}
          {groqApiCalls > 0 && <span> Groq API Calls: {groqApiCalls}</span>}
        </div>
      ) : null}

      {/* Gmail Account Manager Modal */}
      {showAccountManager && (
        <div
          className="modal-overlay"
          onClick={() => setShowAccountManager(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2> Gmail Account</h2>
            <div className="account-info">
              <p className="connected-status">
                {gmailTestMode ? " Test Mode Active" : " Connected"}
              </p>
              <div className="email-display">{gmailUserEmail}</div>

              {gmailTestMode && (
                <div className="test-mode-info">
                  <strong> TEST MODE</strong>
                  <p>Emails are validated but NOT sent</p>
                  <p style={{ fontSize: "12px", marginTop: "8px" }}>
                    Change TEST_MODE in gmailServer.js to enable production mode
                  </p>
                </div>
              )}

              <div className="modal-actions">
                <button
                  onClick={() => setShowAccountManager(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="btn-danger"
                >
                   Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation */}
      {showDisconnectConfirm && (
        <div
          className="modal-overlay"
          onClick={() => setShowDisconnectConfirm(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2> Disconnect Gmail?</h2>
            <p>Are you sure you want to disconnect {gmailUserEmail}?</p>
            <div className="modal-actions">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={disconnectGmail} className="btn-danger">
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gmail Connection Prompt (Auto-triggered during workflow) */}
      {showGmailPrompt && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2> Gmail Required</h2>
            <p>This workflow needs Gmail access to continue.</p>
            <p className="account-note">
              Connect your Gmail account to proceed with email operations.
            </p>
            <div className="modal-actions">
              <button onClick={connectGmail} className="btn-primary">
                 Connect Gmail Now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="builder-content">
        <div
          ref={blocklyDiv}
          className="blockly-container"
          style={{ flex: showOutput ? "0 0 60%" : "1" }}
        />

        {showOutput && (
          <div className="output-panel">
            <div className="output-header">
              <h3> Output</h3>
              <button
                onClick={() => setShowOutput(false)}
                className="btn-close"
              >
                ✕
              </button>
            </div>
            <div className="output-content">
              {output.length === 0 && !isRunning && (
                <p className="output-empty">
                  Run your workflow to see detailed output here
                </p>
              )}
              {isRunning && output.length === 0 && (
                <div className="output-loading">
                  <div className="spinner"></div>
                  <p>Starting workflow...</p>
                </div>
              )}
              {output.map((item, idx) => (
                <div key={idx} className={`output-item output-${item.type}`}>
                  <div className="output-item-header">
                    <span className="output-type">
                      {getOutputEmoji(item.type)}{" "}
                      {item.type.toUpperCase().replace(/-/g, " ")}
                    </span>
                    <span className="output-time">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="output-item-content">{item.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="builder-footer">
        <p>
           Tip: Gmail connection will be requested automatically when needed
          during workflow execution
        </p>
      </div>

      <style jsx>{`
        .gmail-btn {
          background: #3b82f6 !important;
          color: white !important;
        }

        .gmail-connected-btn {
          background: #10b981 !important;
          color: white !important;
        }

        .info-banner {
          background: #fff3cd;
          border-bottom: 2px solid #ffc107;
          padding: 10px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          color: #856404;
          font-size: 14px;
          gap: 20px;
        }

        .test-mode-info {
          background: #fff3cd;
          border: 2px solid #ffc107;
          padding: 12px;
          border-radius: 8px;
          margin: 15px 0;
          color: #856404;
        }

        .test-mode-info strong {
          display: block;
          margin-bottom: 6px;
        }

        .test-mode-info p {
          margin: 4px 0;
          font-size: 13px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-content {
          background: white;
          padding: 32px;
          border-radius: 12px;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-content h2 {
          margin: 0 0 16px 0;
          font-size: 24px;
          color: #1f2937;
        }

        .modal-content p {
          margin: 0 0 12px 0;
          line-height: 1.6;
          color: #6b7280;
        }

        .account-info {
          margin: 16px 0;
        }

        .connected-status {
          font-weight: 600;
          color: #10b981;
          font-size: 16px;
          margin-bottom: 12px;
        }

        .email-display {
          background: #f3f4f6;
          padding: 12px 16px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 14px;
          margin: 12px 0;
          border: 2px solid #e5e7eb;
        }

        .account-note {
          font-size: 14px;
          color: #9ca3af;
          margin-top: 8px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          justify-content: flex-end;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .output-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 40px;
          text-align: center;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
