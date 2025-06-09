#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";

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

interface NorminetteError {
  file: string;
  line: number;
  column: number;
  error_type: string;
  error_code: string;
  description: string;
}

interface NorminetteResult {
  status: "OK" | "Error";
  files_checked: number;
  errors: NorminetteError[];
  summary: string;
}

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

async function runNorminette(targetPath: string): Promise<NorminetteResult> {
  try {
    const output = execSync(`norminette ${targetPath}`, { 
      encoding: 'utf-8',
      timeout: 30000 
    });
    
    return parseNorminetteOutput(output, targetPath);
  } catch (error: any) {
    if (error.stdout) {
      return parseNorminetteOutput(error.stdout, targetPath);
    }
    throw new Error(`Failed to run norminette: ${error.message}`);
  }
}

function parseNorminetteOutput(output: string, targetPath: string): NorminetteResult {
  const lines = output.trim().split('\n');
  const errors: NorminetteError[] = [];
  let filesChecked = 0;

  for (const line of lines) {
    if (line.includes(': OK!')) {
      filesChecked++;
    } else if (line.includes(': Error!')) {
      filesChecked++;
    } else if (line.includes(': ')) {
      const match = line.match(/^(.+?):(\d+):(\d+):\s*(.+?)\s*\((.+?)\)(.*)$/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          error_type: match[4].trim(),
          error_code: match[5].trim(),
          description: match[6].trim() || match[4].trim()
        });
      }
    }
  }

  return {
    status: errors.length > 0 ? "Error" : "OK",
    files_checked: filesChecked,
    errors,
    summary: `Checked ${filesChecked} files, found ${errors.length} errors`
  };
}

async function fixNorminetteErrors(targetPath: string): Promise<any> {
  const norminetteResult = await runNorminette(targetPath);
  const fixResults: any = {
    original_errors: norminetteResult.errors.length,
    fixes_applied: [],
    remaining_errors: [],
    status: "completed"
  };

  if (fs.statSync(targetPath).isDirectory()) {
    const files = getAllCFiles(targetPath);
    for (const file of files) {
      await fixFileErrors(file, fixResults);
    }
  } else if (targetPath.endsWith('.c') || targetPath.endsWith('.h')) {
    await fixFileErrors(targetPath, fixResults);
  }

  const finalResult = await runNorminette(targetPath);
  fixResults.remaining_errors = finalResult.errors;
  fixResults.final_error_count = finalResult.errors.length;

  return fixResults;
}

function getAllCFiles(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      files.push(...getAllCFiles(fullPath));
    } else if (item.endsWith('.c') || item.endsWith('.h')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function fixFileErrors(filePath: string, fixResults: any): Promise<void> {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  content = fixTrailingSpaces(content);
  if (content !== fs.readFileSync(filePath, 'utf-8')) {
    modified = true;
    fixResults.fixes_applied.push({
      file: filePath,
      fix: "Removed trailing spaces"
    });
  }

  content = fixEmptyLines(content);
  if (modified || content !== fs.readFileSync(filePath, 'utf-8')) {
    modified = true;
    if (!fixResults.fixes_applied.some((f: any) => f.file === filePath && f.fix.includes("empty lines"))) {
      fixResults.fixes_applied.push({
        file: filePath,
        fix: "Fixed empty lines at end of file"
      });
    }
  }

  content = fixSpacing(content);
  if (modified || content !== fs.readFileSync(filePath, 'utf-8')) {
    modified = true;
    if (!fixResults.fixes_applied.some((f: any) => f.file === filePath && f.fix.includes("spacing"))) {
      fixResults.fixes_applied.push({
        file: filePath,
        fix: "Fixed spacing issues"
      });
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
  }
}

function fixTrailingSpaces(content: string): string {
  return content.replace(/[ \t]+$/gm, '');
}

function fixEmptyLines(content: string): string {
  content = content.replace(/\n{3,}/g, '\n\n');
  
  if (!content.endsWith('\n')) {
    content += '\n';
  } else {
    content = content.replace(/\n+$/, '\n');
  }
  
  return content;
}

function fixSpacing(content: string): string {
  content = content.replace(/\s*\{\s*/g, '\n{\n');
  content = content.replace(/\s*\}\s*/g, '\n}\n');
  content = content.replace(/;(\w)/g, '; $1');
  content = content.replace(/,(\w)/g, ', $1');
  content = content.replace(/([^=!<>])=([^=])/g, '$1 = $2');
  content = content.replace(/([^=!<>])==([^=])/g, '$1 == $2');
  content = content.replace(/([^=!<>])!=([^=])/g, '$1 != $2');
  
  return content;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});