#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as yaml from "js-yaml";
import * as fs from "fs";
import { runNorminette } from "./norminette.js";
import { fixNorminetteErrors } from "./fix.js";
import { NorminetteError, NorminetteResult } from "./types.js";

const server = new Server(
  {
    name: "norminette-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);


server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
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
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error("No arguments provided");
  }

  try {
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
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});




export { fixNorminetteErrors } from "./fix.js";
export { runNorminette } from "./norminette.js";
export {
  generateClangFormatConfigString,
  checkClangFormatAvailability,
  applyClangFormat,
  applyClangFormatWithFallback
} from "./clang-format.js";
export { NorminetteFormatter } from "./norminette-formatter.js";
export { defaultFormattingRules } from "./formatting-rules.js";
export type { NorminetteError, NorminetteResult, FixResult } from "./types.js";
export type { TokenFormatterRule } from "./norminette-formatter.js";
export { CLexer } from "./lexer/lexer.js";
export { Token, TokenType } from "./lexer/token.js";

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`Server error: ${error}\n`);
    process.exit(1);
  });
}