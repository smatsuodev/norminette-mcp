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
    const output = error.stdout || error.stderr || error.message;
    if (output) {
      return parseNorminetteOutput(output, targetPath);
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
    } else if (line.startsWith('Error: ')) {
      const match = line.match(/^Error:\s+(\w+)\s+\(line:\s*(\d+),\s*col:\s*(\d+)\):\s*(.+)$/);
      if (match) {
        let currentFile = targetPath;
        for (let i = lines.indexOf(line) - 1; i >= 0; i--) {
          if (lines[i].includes(': Error!') || lines[i].includes(': OK!')) {
            currentFile = lines[i].split(':')[0].trim();
            break;
          }
        }
        
        errors.push({
          file: currentFile,
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          error_type: match[1],
          error_code: match[1],
          description: match[4].trim()
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
  const originalContent = content;
  const fixes: string[] = [];

  const formatResult = await applyClangFormatWithFallback(content);
  if (formatResult.formatted !== content) {
    content = formatResult.formatted;
    if (formatResult.usedClangFormat) {
      fixes.push("Applied clang-format for 42 School compliance");
    } else {
      fixes.push("Applied fallback whitespace fixes");
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    fixResults.fixes_applied.push({
      file: filePath,
      fixes: fixes
    });
  }
}

function fixAllWhitespaceIssues(content: string): string {
  return content
    .replace(/[ \t]+$/gm, '')
    .replace(/^[ \t]+$/gm, '')
    .replace(/^    /gm, '\t')
    .replace(/  +/g, ' ');
}

function generateClangFormatConfigString(): string {
  return `Language: Cpp
TabWidth: 4
IndentWidth: 4
UseTab: ForContinuationAndIndentation
SpaceBeforeParens: ControlStatements
AllowShortFunctionsOnASingleLine: None
AlignEscapedNewlines: Left
AllowShortBlocksOnASingleLine: Never
AllowShortIfStatementsOnASingleLine: Never
AlwaysBreakAfterReturnType: None
AlwaysBreakBeforeMultilineStrings: false
BinPackArguments: false
BinPackParameters: false
BreakBeforeBraces: Allman
BreakBeforeTernaryOperators: true
ColumnLimit: 1024
IncludeBlocks: Merge
PointerAlignment: Right
PenaltyBreakBeforeFirstCallParameter: 1
PenaltyBreakString: 1
PenaltyExcessCharacter: 10
PenaltyReturnTypeOnItsOwnLine: 100
SpaceAfterCStyleCast: false
SpaceBeforeAssignmentOperators: true
SpaceBeforeSquareBrackets: false
SpaceInEmptyParentheses: false
SpacesInCStyleCastParentheses: false
SpacesInParentheses: false
SpacesInSquareBrackets: false
AlignOperands: false
Cpp11BracedListStyle: true
SeparateDefinitionBlocks: Always
MaxEmptyLinesToKeep: 1
KeepEmptyLinesAtTheStartOfBlocks: false
InsertNewlineAtEOF: true`;
}

async function checkClangFormatAvailability(): Promise<boolean> {
  try {
    execSync('clang-format --version', { 
      encoding: 'utf-8', 
      timeout: 5000,
      stdio: 'pipe'
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function applyClangFormat(content: string): Promise<string> {
  const isAvailable = await checkClangFormatAvailability();
  if (!isAvailable) {
    throw new Error('clang-format is not available on this system');
  }

  try {
    const configString = generateClangFormatConfigString();
    
    const tempConfigPath = path.join(process.cwd(), '.clang-format-temp');
    fs.writeFileSync(tempConfigPath, configString);
    
    try {
      const formatted = execSync(`clang-format --style=file:.clang-format-temp`, {
        input: content,
        encoding: 'utf-8',
        timeout: 10000,
        cwd: process.cwd()
      });
      
      return formatted;
    } finally {
      if (fs.existsSync(tempConfigPath)) {
        fs.unlinkSync(tempConfigPath);
      }
    }
  } catch (error: any) {
    throw new Error(`clang-format failed: ${error.message}`);
  }
}

async function applyClangFormatWithFallback(content: string): Promise<{ formatted: string; usedClangFormat: boolean }> {
  try {
    const formatted = await applyClangFormat(content);
    return { formatted, usedClangFormat: true };
  } catch (error) {
    console.warn('clang-format failed, falling back to regex-based fixes:', error instanceof Error ? error.message : String(error));
    const fallbackFormatted = fixAllWhitespaceIssues(content);
    return { formatted: fallbackFormatted, usedClangFormat: false };
  }
}


export { 
  fixNorminetteErrors,
  runNorminette,
  generateClangFormatConfigString,
  checkClangFormatAvailability,
  applyClangFormat,
  applyClangFormatWithFallback,
  fixAllWhitespaceIssues
};

export type { NorminetteError, NorminetteResult };

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