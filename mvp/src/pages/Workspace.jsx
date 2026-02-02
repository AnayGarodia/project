import React, { useEffect, useRef, useState } from "react";
import * as Blockly from "blockly";
import { javascriptGenerator } from "blockly/javascript";
import "./customBlocks";
import {
  WorkflowExecutor,
  sampleData,
  workflowTemplates,
  getSampleDataForAgent,
} from "./workflowEngine";
import "./Workspace.css";

/**
 * Custom Blockly Theme
 * Matches our UI design system
 */
const agentTheme = Blockly.Theme.defineTheme("agent_theme", {
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: "#fffbf5",
    toolboxBackgroundColour: "#1a1716",
    toolboxForegroundColour: "#fffbf5",
    flyoutBackgroundColour: "#4a4540",
    flyoutForegroundColour: "#fffbf5",
    flyoutOpacity: 0.95,
    scrollbarColour: "#ff6b52",
    scrollbarOpacity: 0.6,
    insertionMarkerColour: "#ff6b52",
    insertionMarkerOpacity: 0.3,
  },
});

function Workspace() {
  // Refs
  const blocklyDiv = useRef(null);
  const workspace = useRef(null);
  const executor = useRef(new WorkflowExecutor());

  // State
  const [isRunning, setIsRunning] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [executionResult, setExecutionResult] = useState(null);
  const [outputItems, setOutputItems] = useState([]);

  /**
   * Initialize Blockly workspace
   */
  useEffect(() => {
    if (!blocklyDiv.current || workspace.current) return;

    // Define toolbox
    const toolbox = {
      kind: "categoryToolbox",
      contents: [
        {
          kind: "category",
          name: " Agent Control",
          colour: "#7c3aed",
          contents: [
            { kind: "block", type: "agent_start" },
            { kind: "block", type: "if_contains" },
          ],
        },
        {
          kind: "category",
          name: " AI Processing",
          colour: "#10b981",
          contents: [
            { kind: "block", type: "ai_analyze" },
            { kind: "block", type: "ai_generate" },
            { kind: "block", type: "ai_extract" },
          ],
        },
        {
          kind: "category",
          name: " Input Data",
          colour: "#f59e0b",
          contents: [{ kind: "block", type: "input_data" }],
        },
        {
          kind: "category",
          name: " Data Tools",
          colour: "#6b7280",
          contents: [
            { kind: "block", type: "simple_text" },
            { kind: "block", type: "get_variable" },
            { kind: "block", type: "combine_text" },
          ],
        },
        {
          kind: "category",
          name: " Output",
          colour: "#ec4899",
          contents: [
            { kind: "block", type: "display_result" },
            { kind: "block", type: "log_message" },
          ],
        },
      ],
    };

    // Initialize workspace
    workspace.current = Blockly.inject(blocklyDiv.current, {
      toolbox: toolbox,
      theme: agentTheme,
      grid: {
        spacing: 25,
        length: 3,
        colour: "#e5e5e5",
        snap: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.9,
        maxScale: 2,
        minScale: 0.5,
        scaleSpeed: 1.1,
      },
      trashcan: true,
      move: {
        scrollbars: true,
        drag: true,
        wheel: true,
      },
    });

    // Add starter block
    const starterBlock = workspace.current.newBlock("agent_start");
    starterBlock.initSvg();
    starterBlock.render();
    starterBlock.moveBy(100, 80);

    // Cleanup
    return () => {
      if (workspace.current) {
        workspace.current.dispose();
        workspace.current = null;
      }
    };
  }, []);

  /**
   * Handle workflow execution
   */
  const handleRun = async () => {
    if (!workspace.current) return;

    setIsRunning(true);
    setExecutionResult(null);
    setOutputItems([]);
    setShowOutput(true);

    try {
      // Generate code from blocks
      const code = javascriptGenerator.workspaceToCode(workspace.current);
      setGeneratedCode(code);

      console.log("Generated code:", code);

      // Check if workspace has blocks
      const blocks = workspace.current.getAllBlocks();
      if (blocks.length === 0) {
        setExecutionResult({
          success: false,
          error: "No blocks in workspace",
          output: [],
        });
        setIsRunning(false);
        return;
      }

      // Determine agent type
      const startBlock = blocks.find((b) => b.type === "agent_start");
      const agentType = startBlock?.getFieldValue("AGENT_TYPE") || "support";

      console.log("Agent type:", agentType);

      // Load appropriate sample data
      const inputData = getSampleDataForAgent(agentType);
      executor.current.setInputData(inputData);

      // Execute workflow with live updates
      const result = await executor.current.execute(code, (outputs) => {
        setOutputItems([...outputs]);
      });

      setExecutionResult(result);
      setOutputItems(result.output);
    } catch (error) {
      console.error("Execution error:", error);
      setExecutionResult({
        success: false,
        error: error.message,
        output: [],
      });
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Show/hide generated code
   */
  const handleShowCode = () => {
    if (workspace.current) {
      try {
        const code = javascriptGenerator.workspaceToCode(workspace.current);
        setGeneratedCode(code || "// No blocks to generate code from");
      } catch (error) {
        setGeneratedCode(`// Error generating code: ${error.message}`);
      }
      setShowCode(!showCode);
    }
  };

  /**
   * Save workflow as JSON
   */
  const handleSave = () => {
    if (workspace.current) {
      const state = Blockly.serialization.workspaces.save(workspace.current);
      const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agent-workflow-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  /**
   * Clear workspace
   */
  const handleClear = () => {
    if (workspace.current && window.confirm("Clear entire workspace?")) {
      workspace.current.clear();

      // Add fresh starter block
      const starterBlock = workspace.current.newBlock("agent_start");
      starterBlock.initSvg();
      starterBlock.render();
      starterBlock.moveBy(100, 80);

      // Reset state
      setExecutionResult(null);
      setOutputItems([]);
      setShowOutput(false);
      setGeneratedCode("");
    }
  };

  /**
   * Load a template workflow
   */
  const loadTemplate = (templateKey) => {
    if (!workspace.current) return;

    const template = workflowTemplates[templateKey];
    if (!template) {
      alert("Template not found!");
      return;
    }

    // Clear workspace
    workspace.current.clear();

    // For MVP, we'll create the blocks programmatically
    // In production, you'd use Blockly.serialization.workspaces.load()

    if (templateKey === "customerSupport") {
      createCustomerSupportTemplate();
    } else if (templateKey === "salesReport") {
      createSalesReportTemplate();
    }

    setShowTemplates(false);
  };

  /**
   * Create Customer Support template blocks
   */
  const createCustomerSupportTemplate = () => {
    const ws = workspace.current;

    // Create blocks
    const start = ws.newBlock("agent_start");
    const input = ws.newBlock("input_data");
    const analyze = ws.newBlock("ai_analyze");
    const generate = ws.newBlock("ai_generate");
    const display = ws.newBlock("display_result");
    const getAnalysis = ws.newBlock("get_variable");

    // Configure blocks
    start.setFieldValue("support", "AGENT_TYPE");
    input.setFieldValue("email", "INPUT_TYPE");
    analyze.setFieldValue(
      "Identify: 1) Main issue, 2) Customer sentiment, 3) Urgency level",
      "TASK"
    );
    analyze.setFieldValue("analysis", "VAR_NAME");
    generate.setFieldValue(
      "Draft a professional, empathetic email response addressing the issue",
      "TASK"
    );
    generate.setFieldValue("response", "VAR_NAME");
    display.setFieldValue("email", "FORMAT");
    getAnalysis.setFieldValue("analysis", "VAR");

    // Initialize
    [start, input, analyze, generate, display, getAnalysis].forEach((b) => {
      b.initSvg();
      b.render();
    });

    // Position blocks
    start.moveBy(50, 50);
    analyze.moveBy(50, 200);
    input.moveBy(350, 200);
    generate.moveBy(50, 380);
    getAnalysis.moveBy(350, 380);
    display.moveBy(50, 560);

    // Connect blocks
    try {
      start.getInput("STEPS").connection.connect(analyze.previousConnection);
      analyze.getInput("INPUT").connection.connect(input.outputConnection);
      analyze.nextConnection.connect(generate.previousConnection);
      generate
        .getInput("INPUT")
        .connection.connect(getAnalysis.outputConnection);
      generate.nextConnection.connect(display.previousConnection);

      // Get response variable for display
      const getResponse = ws.newBlock("get_variable");
      getResponse.setFieldValue("response", "VAR");
      getResponse.initSvg();
      getResponse.render();
      getResponse.moveBy(350, 560);
      display
        .getInput("RESULT")
        .connection.connect(getResponse.outputConnection);
    } catch (e) {
      console.error("Error connecting blocks:", e);
    }
  };

  /**
   * Create Sales Report template blocks
   */
  const createSalesReportTemplate = () => {
    const ws = workspace.current;

    // Create blocks
    const start = ws.newBlock("agent_start");
    const input = ws.newBlock("input_data");
    const analyze = ws.newBlock("ai_analyze");
    const generate = ws.newBlock("ai_generate");
    const display = ws.newBlock("display_result");
    const getAnalysis = ws.newBlock("get_variable");

    // Configure blocks
    start.setFieldValue("sales", "AGENT_TYPE");
    input.setFieldValue("csv", "INPUT_TYPE");
    analyze.setFieldValue(
      "Calculate: 1) Total revenue, 2) Best product, 3) Top region, 4) Key trends",
      "TASK"
    );
    analyze.setFieldValue("insights", "VAR_NAME");
    generate.setFieldValue(
      "Create an executive summary with key metrics and business recommendations",
      "TASK"
    );
    generate.setFieldValue("report", "VAR_NAME");
    display.setFieldValue("report", "FORMAT");
    getAnalysis.setFieldValue("insights", "VAR");

    // Initialize
    [start, input, analyze, generate, display, getAnalysis].forEach((b) => {
      b.initSvg();
      b.render();
    });

    // Position blocks
    start.moveBy(50, 50);
    analyze.moveBy(50, 200);
    input.moveBy(350, 200);
    generate.moveBy(50, 380);
    getAnalysis.moveBy(350, 380);
    display.moveBy(50, 560);

    // Connect blocks
    try {
      start.getInput("STEPS").connection.connect(analyze.previousConnection);
      analyze.getInput("INPUT").connection.connect(input.outputConnection);
      analyze.nextConnection.connect(generate.previousConnection);
      generate
        .getInput("INPUT")
        .connection.connect(getAnalysis.outputConnection);
      generate.nextConnection.connect(display.previousConnection);

      // Get report variable for display
      const getReport = ws.newBlock("get_variable");
      getReport.setFieldValue("report", "VAR");
      getReport.initSvg();
      getReport.render();
      getReport.moveBy(350, 560);
      display.getInput("RESULT").connection.connect(getReport.outputConnection);
    } catch (e) {
      console.error("Error connecting blocks:", e);
    }
  };

  /**
   * Get output item styling based on type
   */
  const getOutputItemClass = (type) => {
    const classMap = {
      processing: "output-processing",
      error: "output-error",
      warning: "output-warning",
      log: "output-log",
      text: "output-text",
      email: "output-email",
      report: "output-report",
      summary: "output-summary",
    };
    return classMap[type] || "output-text";
  };

  return (
    <div className="workspace-page">
      {/* Header */}
      <div className="workspace-header">
        <div className="workspace-title">
          <h1>AI Agent Builder</h1>
          <span className="workspace-subtitle">
            Drag blocks to create your workflow
          </span>
        </div>

        <div className="workspace-actions">
          <button
            className="action-btn secondary"
            onClick={() => setShowTemplates(!showTemplates)}
            title="Load a pre-built template"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 4h12M2 8h12M2 12h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Templates
          </button>

          <button
            className="action-btn secondary"
            onClick={handleClear}
            title="Clear workspace"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Clear
          </button>

          <button
            className="action-btn secondary"
            onClick={handleShowCode}
            title="View generated code"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M5.333 12L1.333 8l4-4M10.667 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {showCode ? "Hide" : "Show"} Code
          </button>

          <button
            className="action-btn secondary"
            onClick={handleSave}
            title="Save workflow"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M13.333 14v-4a1.333 1.333 0 00-1.333-1.333H4A1.333 1.333 0 002.667 10v4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Save
          </button>

          <button
            className={`action-btn primary ${isRunning ? "running" : ""}`}
            onClick={handleRun}
            disabled={isRunning}
            title="Run the workflow"
          >
            {isRunning ? (
              <>
                <div className="spinner"></div>
                Running...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.333 2.667v10.666L12.667 8 3.333 2.667z"
                    fill="currentColor"
                  />
                </svg>
                Run Agent
              </>
            )}
          </button>
        </div>
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <div className="templates-panel">
          <div className="templates-header">
            <h3>Quick Start Templates</h3>
            <button onClick={() => setShowTemplates(false)}>×</button>
          </div>
          <div className="templates-grid">
            <div
              className="template-card"
              onClick={() => loadTemplate("customerSupport")}
            >
              <div className="template-icon"></div>
              <h4>Customer Support</h4>
              <p>
                Automatically analyze customer emails and draft professional
                responses
              </p>
            </div>
            <div
              className="template-card"
              onClick={() => loadTemplate("salesReport")}
            >
              <div className="template-icon"></div>
              <h4>Sales Report</h4>
              <p>
                Transform sales data into actionable insights and executive
                summaries
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="workspace-container">
        <div
          ref={blocklyDiv}
          className="blockly-workspace"
          style={{ width: showOutput ? "60%" : "100%" }}
        />

        {/* Output Panel */}
        {showOutput && (
          <div className="output-panel">
            <div className="output-header">
              <span> Execution Results</span>
              <button
                className="output-close"
                onClick={() => setShowOutput(false)}
              >
                ×
              </button>
            </div>
            <div className="output-content">
              {isRunning && outputItems.length === 0 ? (
                <div className="output-loading">
                  <div className="spinner"></div>
                  <p>Starting AI agent...</p>
                </div>
              ) : executionResult ? (
                <div className="output-results">
                  {!executionResult.success && (
                    <div className="output-error">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M10 6v4m0 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"
                          stroke="#ef4444"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                      Error: {executionResult.error}
                    </div>
                  )}

                  {outputItems.map((item, index) => (
                    <div
                      key={index}
                      className={`output-item ${getOutputItemClass(item.type)}`}
                    >
                      <div className="output-item-header">
                        <span className="output-type">
                          {item.type.toUpperCase()}
                        </span>
                        <span className="output-time">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="output-item-content">{item.content}</div>
                    </div>
                  ))}

                  {executionResult.success && outputItems.length > 0 && (
                    <div className="output-success">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M16.667 5L7.5 14.167 3.333 10"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Workflow completed successfully!
                    </div>
                  )}
                </div>
              ) : (
                <div className="output-empty">
                  <p>Click "Run Agent" to see results here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Code Panel */}
        {showCode && (
          <div className="code-panel">
            <div className="code-header">
              <span>Generated JavaScript Code</span>
              <button className="code-close" onClick={() => setShowCode(false)}>
                ×
              </button>
            </div>
            <pre className="code-content">{generatedCode}</pre>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="workspace-footer">
        <div className="footer-info">
          <span className="footer-icon"></span>
          <span>
            Tip: Start with a template or drag the " Start Agent" block to
            begin
          </span>
        </div>
        <div className="footer-shortcuts">
          <kbd>Ctrl</kbd> + <kbd>Z</kbd> Undo
          <span className="shortcut-divider">|</span>
          <kbd>Delete</kbd> Remove block
        </div>
      </div>
    </div>
  );
}

export default Workspace;
