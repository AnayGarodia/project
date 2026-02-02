import React, { useEffect, useRef } from "react";
import * as Blockly from "blockly/core";
import "blockly/javascript";
import { javascriptGenerator } from "blockly/javascript";
import "./customBlocks";

const toolbox = {
  kind: "flyoutToolbox",
  contents: [
    { kind: "block", type: "input_text" },
    { kind: "block", type: "log_text" },
  ],
};

export default function BlocklyWorkspace() {
  const blocklyDiv = useRef(null);
  const workspaceRef = useRef(null);

  useEffect(() => {
    workspaceRef.current = Blockly.inject(blocklyDiv.current, {
      toolbox,
    });
  }, []);

  const runCode = () => {
    const code = javascriptGenerator.workspaceToCode(workspaceRef.current);
    console.clear();
    console.log("Running:");
    console.log(code);
    eval(code);
  };

  return (
    <>
      <button onClick={runCode} style={{ margin: 10 }}>
        Run
      </button>
      <div ref={blocklyDiv} style={{ height: "500px", width: "100%" }} />
    </>
  );
}
