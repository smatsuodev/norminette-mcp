import * as yaml from "js-yaml";
import * as fs from "fs";
import { runNorminette } from "../core/norminette.js";
import { fixNorminetteErrors } from "../fixing/pipeline.js";

export const toolDefinitions = [
  {
    name: "norminette_check",
    description: "Run norminette on specified files or directory and return results in YAML format",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File or directory path to check with norminette",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "norminette_fix",
    description: "Automatically fix common norminette errors in specified files",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File or directory path to fix norminette errors",
        },
      },
      required: ["path"],
    },
  },
];

export async function handleToolCall(name: string, args: any) {
  if (!args) {
    throw new Error("No arguments provided");
  }

  if (name === "norminette_check") {
    const targetPath = args.path as string;
    
    if (!targetPath) {
      throw new Error("Path argument is required");
    }
    
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Path does not exist: ${targetPath}`);
    }

    const result = await runNorminette(targetPath);
    const yamlOutput = yaml.dump(result, { indent: 2 });

    return {
      content: [
        {
          type: "text",
          text: yamlOutput,
        },
      ],
    };
  } else if (name === "norminette_fix") {
    const targetPath = args.path as string;
    
    if (!targetPath) {
      throw new Error("Path argument is required");
    }
    
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Path does not exist: ${targetPath}`);
    }

    const fixResult = await fixNorminetteErrors(targetPath);
    const yamlOutput = yaml.dump(fixResult, { indent: 2 });

    return {
      content: [
        {
          type: "text",
          text: yamlOutput,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}