import * as Blockly from "blockly";
import { javascriptGenerator } from "blockly/javascript";

/**
 * CUSTOM BLOCKS FOR AI AGENT BUILDER - V3 IMPROVED
 *
 * NEW FEATURES:
 * - Control number of emails to process
 * - Better variable handling in send reply
 * - Improved logging
 */

// ============================================================================
// CONTROL BLOCKS (Purple - #7c3aed)
// ============================================================================

Blockly.Blocks["agent_start"] = {
  init: function () {
    this.appendDummyInput()
      .appendField(" Start Agent:")
      .appendField(
        new Blockly.FieldDropdown([
          ["Customer Support", "support"],
          ["Sales Analyst", "sales"],
          ["Data Processor", "data"],
          ["Email Auto-Responder", "email"],
        ]),
        "AGENT_TYPE"
      );
    this.appendStatementInput("STEPS")
      .setCheck(null)
      .appendField("workflow steps:");
    this.setColour("#7c3aed");
    this.setTooltip("The starting point of your AI agent");
    this.setHelpUrl("");
  },
};

javascriptGenerator.forBlock["agent_start"] = function (block) {
  const agentType = block.getFieldValue("AGENT_TYPE");
  const steps = javascriptGenerator.statementToCode(block, "STEPS");

  const code = `
// ${agentType.toUpperCase()} AGENT
context.log(" Starting ${agentType} agent...");
${steps}
`;
  return code;
};

Blockly.Blocks["if_contains"] = {
  init: function () {
    this.appendValueInput("TEXT").setCheck(null).appendField(" If this text");
    this.appendDummyInput()
      .appendField("contains keyword:")
      .appendField(new Blockly.FieldTextInput("urgent"), "KEYWORD");
    this.appendStatementInput("DO").setCheck(null).appendField("then do:");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#7c3aed");
    this.setTooltip("Execute steps only if text contains a keyword");
  },
};

javascriptGenerator.forBlock["if_contains"] = function (block) {
  const text =
    javascriptGenerator.valueToCode(
      block,
      "TEXT",
      javascriptGenerator.ORDER_NONE
    ) || '""';
  const keyword = block.getFieldValue("KEYWORD");
  const doCode = javascriptGenerator.statementToCode(block, "DO");

  const code = `
if (String(${text}).toLowerCase().includes("${keyword.toLowerCase()}")) {
  context.log("✓ Keyword '${keyword}' found, executing conditional steps...");
${doCode}}
`;
  return code;
};

// ============================================================================
// INPUT BLOCKS (Orange - #f59e0b)
// ============================================================================

Blockly.Blocks["input_data"] = {
  init: function () {
    this.appendDummyInput()
      .appendField(" Get input field:")
      .appendField(new Blockly.FieldTextInput("emailBody"), "FIELD_NAME");
    this.setOutput(true, "String");
    this.setColour("#f59e0b");
    this.setTooltip("Get data from the workflow input");
  },
};

javascriptGenerator.forBlock["input_data"] = function (block) {
  const fieldName = block.getFieldValue("FIELD_NAME");
  const code = `(context.inputData.${fieldName} || "")`;
  return [code, javascriptGenerator.ORDER_MEMBER];
};

// ============================================================================
// GMAIL BLOCKS (Blue - #3b82f6)
// ============================================================================

/**
 * IMPROVED: Fetch unread emails with count control
 */
Blockly.Blocks["gmail_fetch_unread"] = {
  init: function () {
    this.appendDummyInput()
      .appendField(" Fetch")
      .appendField(
        new Blockly.FieldDropdown([
          ["all unread", "all"],
          ["first 1", "1"],
          ["first 3", "3"],
          ["first 5", "5"],
          ["first 10", "10"],
          ["first 20", "20"],
        ]),
        "MAX_EMAILS"
      )
      .appendField("emails");
    this.appendDummyInput()
      .appendField("save as:")
      .appendField(new Blockly.FieldTextInput("emails"), "VAR_NAME");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#3b82f6");
    this.setTooltip("Fetch unread emails from Gmail");
  },
};

javascriptGenerator.forBlock["gmail_fetch_unread"] = function (block) {
  const varName = block.getFieldValue("VAR_NAME");
  const maxEmails = block.getFieldValue("MAX_EMAILS");

  const code = `
const allEmails = await context.fetchEmails();
const ${varName} = ${
    maxEmails === "all" ? "allEmails" : `allEmails.slice(0, ${maxEmails})`
  };
context.log(\` Processing \${${varName}.length} of \${allEmails.length} unread email(s)\`);
`;
  return code;
};

Blockly.Blocks["gmail_for_each_email"] = {
  init: function () {
    this.appendDummyInput()
      .appendField(" For each email in:")
      .appendField(new Blockly.FieldTextInput("emails"), "EMAIL_LIST");
    this.appendStatementInput("DO").setCheck(null).appendField("do:");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#3b82f6");
    this.setTooltip("Process each email in a list");
  },
};

javascriptGenerator.forBlock["gmail_for_each_email"] = function (block) {
  const emailList = block.getFieldValue("EMAIL_LIST");
  const doCode = javascriptGenerator.statementToCode(block, "DO");

  const code = `
if (Array.isArray(${emailList})) {
  for (const currentEmail of ${emailList}) {
    context.log(\` Processing email from: \${currentEmail.from}\`);
${doCode}  }
} else {
  context.log("  ${emailList} is not an array, skipping loop");
}
`;
  return code;
};

Blockly.Blocks["gmail_get_property"] = {
  init: function () {
    this.appendDummyInput()
      .appendField(" Get from current email:")
      .appendField(
        new Blockly.FieldDropdown([
          ["Subject", "subject"],
          ["Body", "body"],
          ["Sender", "from"],
          ["Email ID", "id"],
          ["Thread ID", "threadId"],
        ]),
        "PROPERTY"
      );
    this.setOutput(true, "String");
    this.setColour("#3b82f6");
    this.setTooltip("Get a property from the current email");
  },
};

javascriptGenerator.forBlock["gmail_get_property"] = function (block) {
  const property = block.getFieldValue("PROPERTY");
  return [
    `(currentEmail?.${property} || "")`,
    javascriptGenerator.ORDER_MEMBER,
  ];
};

/**
 * IMPROVED: Send reply block that properly uses variables
 */
Blockly.Blocks["gmail_send_reply"] = {
  init: function () {
    this.appendDummyInput()
      .appendField(" Send reply using:")
      .appendField(new Blockly.FieldTextInput("response"), "REPLY_VAR");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#3b82f6");
    this.setTooltip("Send a reply using a saved variable");
  },
};

javascriptGenerator.forBlock["gmail_send_reply"] = function (block) {
  const replyVar = block.getFieldValue("REPLY_VAR");

  const code = `
if (currentEmail && ${replyVar}) {
  await context.sendReply(
    currentEmail.id,
    ${replyVar},
    currentEmail.subject,
    currentEmail.from,
    currentEmail.threadId
  );
  context.log(\` Reply sent to: \${currentEmail.from}\`);
} else {
  context.log(\`  Cannot send reply: \${!currentEmail ? "no current email" : "reply is empty"}\`);
}
`;
  return code;
};

Blockly.Blocks["gmail_mark_read"] = {
  init: function () {
    this.appendDummyInput().appendField(" Mark current email as read");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#3b82f6");
    this.setTooltip("Mark the current email as read");
  },
};

javascriptGenerator.forBlock["gmail_mark_read"] = function (block) {
  const code = `
if (currentEmail?.id) {
  await context.markRead(currentEmail.id);
  context.log("✓ Email marked as read");
} else {
  context.log("  No current email to mark as read");
}
`;
  return code;
};

// ============================================================================
// AI PROCESSING BLOCKS (Green - #10b981)
// ============================================================================

Blockly.Blocks["ai_analyze"] = {
  init: function () {
    this.appendValueInput("INPUT").setCheck(null).appendField(" AI Analyze");
    this.appendDummyInput()
      .appendField("Task:")
      .appendField(
        new Blockly.FieldTextInput("Analyze the sentiment and urgency"),
        "TASK"
      );
    this.appendDummyInput()
      .appendField("Save result as:")
      .appendField(new Blockly.FieldTextInput("analysis"), "VAR_NAME");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#10b981");
    this.setTooltip("Use AI to analyze and understand data");
    this.setInputsInline(false);
  },
};

javascriptGenerator.forBlock["ai_analyze"] = function (block) {
  const input =
    javascriptGenerator.valueToCode(
      block,
      "INPUT",
      javascriptGenerator.ORDER_NONE
    ) || '""';
  const task = block.getFieldValue("TASK");
  const varName = block.getFieldValue("VAR_NAME");

  const code = `
const ${varName} = await context.callAI(${input}, "${task.replace(
    /"/g,
    '\\"'
  )}");
context.log("✓ AI Analysis complete, saved as '${varName}'");
`;
  return code;
};

Blockly.Blocks["ai_generate"] = {
  init: function () {
    this.appendValueInput("INPUT").setCheck(null).appendField(" AI Generate");
    this.appendDummyInput()
      .appendField("Task:")
      .appendField(
        new Blockly.FieldTextInput("Draft a professional email response"),
        "TASK"
      );
    this.appendDummyInput()
      .appendField("Save result as:")
      .appendField(new Blockly.FieldTextInput("response"), "VAR_NAME");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#10b981");
    this.setTooltip("Use AI to generate content");
    this.setInputsInline(false);
  },
};

javascriptGenerator.forBlock["ai_generate"] = function (block) {
  const input =
    javascriptGenerator.valueToCode(
      block,
      "INPUT",
      javascriptGenerator.ORDER_NONE
    ) || '""';
  const task = block.getFieldValue("TASK");
  const varName = block.getFieldValue("VAR_NAME");

  const code = `
const ${varName} = await context.callAI(${input}, "${task.replace(
    /"/g,
    '\\"'
  )}");
context.log("✓ AI Generation complete, saved as '${varName}'");
`;
  return code;
};

Blockly.Blocks["ai_extract"] = {
  init: function () {
    this.appendValueInput("INPUT").setCheck(null).appendField(" AI Extract");
    this.appendDummyInput()
      .appendField("What to extract:")
      .appendField(
        new Blockly.FieldTextInput("customer name and order number"),
        "WHAT"
      );
    this.appendDummyInput()
      .appendField("Save result as:")
      .appendField(new Blockly.FieldTextInput("extracted"), "VAR_NAME");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#10b981");
    this.setTooltip("Extract specific information using AI");
    this.setInputsInline(false);
  },
};

javascriptGenerator.forBlock["ai_extract"] = function (block) {
  const input =
    javascriptGenerator.valueToCode(
      block,
      "INPUT",
      javascriptGenerator.ORDER_NONE
    ) || '""';
  const what = block.getFieldValue("WHAT");
  const varName = block.getFieldValue("VAR_NAME");

  const code = `
const ${varName} = await context.callAI(${input}, "Extract the following information: ${what.replace(
    /"/g,
    '\\"'
  )}");
context.log("✓ AI Extraction complete, saved as '${varName}'");
`;
  return code;
};

// ============================================================================
// DATA BLOCKS (Gray - #6b7280)
// ============================================================================

Blockly.Blocks["simple_text"] = {
  init: function () {
    this.appendDummyInput()
      .appendField('"')
      .appendField(new Blockly.FieldTextInput("text"), "TEXT")
      .appendField('"');
    this.setOutput(true, "String");
    this.setColour("#6b7280");
    this.setTooltip("A piece of text");
  },
};

javascriptGenerator.forBlock["simple_text"] = function (block) {
  const text = block.getFieldValue("TEXT").replace(/"/g, '\\"');
  const code = `"${text}"`;
  return [code, javascriptGenerator.ORDER_ATOMIC];
};

Blockly.Blocks["get_variable"] = {
  init: function () {
    this.appendDummyInput()
      .appendField(" Get:")
      .appendField(new Blockly.FieldTextInput("variable"), "VAR");
    this.setOutput(true, null);
    this.setColour("#6b7280");
    this.setTooltip("Get a previously saved value");
  },
};

javascriptGenerator.forBlock["get_variable"] = function (block) {
  const varName = block.getFieldValue("VAR");
  return [varName, javascriptGenerator.ORDER_ATOMIC];
};

Blockly.Blocks["combine_text"] = {
  init: function () {
    this.appendValueInput("TEXT1").setCheck(null).appendField(" Combine");
    this.appendValueInput("TEXT2").setCheck(null).appendField("with");
    this.setOutput(true, "String");
    this.setColour("#6b7280");
    this.setTooltip("Combine two pieces of text");
    this.setInputsInline(false);
  },
};

javascriptGenerator.forBlock["combine_text"] = function (block) {
  const text1 =
    javascriptGenerator.valueToCode(
      block,
      "TEXT1",
      javascriptGenerator.ORDER_NONE
    ) || '""';
  const text2 =
    javascriptGenerator.valueToCode(
      block,
      "TEXT2",
      javascriptGenerator.ORDER_NONE
    ) || '""';

  const code = `(String(${text1}) + " " + String(${text2}))`;
  return [code, javascriptGenerator.ORDER_ADDITION];
};

// ============================================================================
// OUTPUT BLOCKS (Pink - #ec4899)
// ============================================================================

Blockly.Blocks["display_result"] = {
  init: function () {
    this.appendValueInput("RESULT")
      .setCheck(null)
      .appendField(" Display result:");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#ec4899");
    this.setTooltip("Display the final result");
  },
};

javascriptGenerator.forBlock["display_result"] = function (block) {
  const result =
    javascriptGenerator.valueToCode(
      block,
      "RESULT",
      javascriptGenerator.ORDER_NONE
    ) || '""';

  const code = `
context.output(${result});
`;
  return code;
};

Blockly.Blocks["log_message"] = {
  init: function () {
    this.appendValueInput("MESSAGE").setCheck(null).appendField(" Log:");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#6b7280");
    this.setTooltip("Show a status message");
  },
};

javascriptGenerator.forBlock["log_message"] = function (block) {
  const message =
    javascriptGenerator.valueToCode(
      block,
      "MESSAGE",
      javascriptGenerator.ORDER_NONE
    ) || '""';

  const code = `
context.log(${message});
`;
  return code;
};

// ============================================================================
// INITIALIZATION
// ============================================================================

export const initializeBlocks = () => {
  console.log(" Custom AI Agent blocks initialized (V3 - IMPROVED)");
  console.log("    NEW: Email count control in fetch block");
  console.log("    NEW: Better variable handling in send reply");
  console.log("   - Control blocks: agent_start, if_contains");
  console.log("   - Input blocks: input_data");
  console.log(
    "   - Gmail blocks: gmail_fetch_unread, gmail_for_each_email, gmail_get_property, gmail_send_reply, gmail_mark_read"
  );
  console.log("   - AI blocks: ai_analyze, ai_generate, ai_extract");
  console.log("   - Data blocks: simple_text, get_variable, combine_text");
  console.log("   - Output blocks: display_result, log_message");
};

// Auto-initialize when module loads
initializeBlocks();
