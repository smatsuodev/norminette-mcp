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
      // Parse error lines like: "Error: INVALID_HEADER       (line:   1, col:   1):	Missing or invalid 42 header"
      const match = line.match(/^Error:\s+(\w+)\s+\(line:\s*(\d+),\s*col:\s*(\d+)\):\s*(.+)$/);
      if (match) {
        // Get the current file from previous lines
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

  // SPC_BEFORE_NL: Remove trailing spaces
  const trailingSpaceFixed = fixTrailingSpaces(content);
  if (trailingSpaceFixed !== content) {
    content = trailingSpaceFixed;
    fixes.push("SPC_BEFORE_NL: Removed trailing spaces");
  }

  // SPACE_EMPTY_LINE: Remove spaces on empty lines
  const emptyLineSpaceFixed = fixSpaceOnEmptyLines(content);
  if (emptyLineSpaceFixed !== content) {
    content = emptyLineSpaceFixed;
    fixes.push("SPACE_EMPTY_LINE: Removed spaces on empty lines");
  }

  // SPC_INSTEAD_TAB: Convert leading spaces to tabs
  const leadingSpacesFixed = fixLeadingSpaces(content);
  if (leadingSpacesFixed !== content) {
    content = leadingSpacesFixed;
    fixes.push("SPC_INSTEAD_TAB: Converted leading spaces to tabs");
  }

  // TAB_INSTEAD_SPC: Convert tabs to spaces where needed (not at line start)
  const tabsToSpacesFixed = fixTabsToSpaces(content);
  if (tabsToSpacesFixed !== content) {
    content = tabsToSpacesFixed;
    fixes.push("TAB_INSTEAD_SPC: Converted tabs to spaces where needed");
  }

  // CONSECUTIVE_SPC: Fix consecutive spaces
  const consecutiveSpacesFixed = fixConsecutiveSpaces(content);
  if (consecutiveSpacesFixed !== content) {
    content = consecutiveSpacesFixed;
    fixes.push("CONSECUTIVE_SPC: Fixed consecutive spaces");
  }

  // CONSECUTIVE_WS: Fix consecutive whitespaces
  const consecutiveWhitespaceFixed = fixConsecutiveWhitespace(content);
  if (consecutiveWhitespaceFixed !== content) {
    content = consecutiveWhitespaceFixed;
    fixes.push("CONSECUTIVE_WS: Fixed consecutive whitespace");
  }

  // MIXED_SPACE_TAB: Fix mixed spaces and tabs
  const mixedSpaceTabFixed = fixMixedSpacesAndTabs(content);
  if (mixedSpaceTabFixed !== content) {
    content = mixedSpaceTabFixed;
    fixes.push("MIXED_SPACE_TAB: Fixed mixed spaces and tabs");
  }


  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    fixResults.fixes_applied.push({
      file: filePath,
      fixes: fixes
    });
  }
}

// SPC_BEFORE_NL: Remove trailing spaces
function fixTrailingSpaces(content: string): string {
  return content.replace(/[ \t]+$/gm, '');
}

// SPACE_EMPTY_LINE: Remove spaces on empty lines
function fixSpaceOnEmptyLines(content: string): string {
  return content.replace(/^[ \t]+$/gm, '');
}

// SPC_INSTEAD_TAB: Convert leading spaces to tabs
function fixLeadingSpaces(content: string): string {
  const lines = content.split('\n');
  return lines.map(line => {
    // Count leading spaces and convert groups of 4 spaces to tabs
    const leadingSpaces = line.match(/^( +)/);
    if (leadingSpaces) {
      const spaceCount = leadingSpaces[1].length;
      const tabCount = Math.floor(spaceCount / 4);
      const remainingSpaces = spaceCount % 4;
      const tabs = '\t'.repeat(tabCount);
      const spaces = ' '.repeat(remainingSpaces);
      return tabs + spaces + line.substring(spaceCount);
    }
    return line;
  }).join('\n');
}

// TAB_INSTEAD_SPC: Convert tabs to spaces where needed (not at line start)
function fixTabsToSpaces(content: string): string {
  const lines = content.split('\n');
  return lines.map(line => {
    // Skip empty lines
    if (line.trim() === '') return line;
    
    // Find the end of leading whitespace
    const leadingWhitespace = line.match(/^[\t ]*/);
    const leadingLength = leadingWhitespace ? leadingWhitespace[0].length : 0;
    
    // Replace tabs with spaces in the non-leading part
    const leadingPart = line.substring(0, leadingLength);
    const restPart = line.substring(leadingLength).replace(/\t/g, ' ');
    
    return leadingPart + restPart;
  }).join('\n');
}

// CONSECUTIVE_SPC: Fix consecutive spaces (except at line start)
function fixConsecutiveSpaces(content: string): string {
  const lines = content.split('\n');
  return lines.map(line => {
    // Skip empty lines
    if (line.trim() === '') return line;
    
    // Find the end of leading whitespace (tabs and spaces at start)
    const leadingWhitespace = line.match(/^[\t ]*/);
    const leadingLength = leadingWhitespace ? leadingWhitespace[0].length : 0;
    
    // Fix consecutive spaces in the non-leading part
    const leadingPart = line.substring(0, leadingLength);
    let restPart = line.substring(leadingLength);
    
    // Replace consecutive spaces with single space
    restPart = restPart.replace(/ {2,}/g, ' ');
    
    return leadingPart + restPart;
  }).join('\n');
}

// CONSECUTIVE_WS: Fix consecutive whitespace characters
function fixConsecutiveWhitespace(content: string): string {
  const lines = content.split('\n');
  return lines.map(line => {
    // Skip empty lines
    if (line.trim() === '') return line;
    
    // Find the end of leading whitespace
    const leadingWhitespace = line.match(/^[\t ]*/);
    const leadingLength = leadingWhitespace ? leadingWhitespace[0].length : 0;
    
    // Fix consecutive whitespace in the non-leading part
    const leadingPart = line.substring(0, leadingLength);
    const restPart = line.substring(leadingLength).replace(/[ \t]{2,}/g, match => {
      // If it's all spaces, reduce to one space
      if (match.match(/^ +$/)) return ' ';
      // If it's all tabs, reduce to one tab
      if (match.match(/^\t+$/)) return '\t';
      // If mixed, convert to single space
      return ' ';
    });
    
    return leadingPart + restPart;
  }).join('\n');
}

// MIXED_SPACE_TAB: Fix mixed spaces and tabs
function fixMixedSpacesAndTabs(content: string): string {
  const lines = content.split('\n');
  return lines.map(line => {
    // Skip empty lines
    if (line.trim() === '') return line;
    
    // Check for mixed spaces and tabs in leading whitespace
    const leadingWhitespace = line.match(/^[\t ]*/);
    let leadingPart = '';
    let restPart = line;
    
    if (leadingWhitespace) {
      const leading = leadingWhitespace[0];
      const leadingLength = leading.length;
      
      // If there are mixed spaces and tabs in leading whitespace
      if (leading.includes(' ') && leading.includes('\t')) {
        // Convert all to tabs (groups of 4 spaces = 1 tab)
        const totalSpaces = leading.split('').reduce((count, char) => {
          return count + (char === '\t' ? 4 : 1);
        }, 0);
        const tabCount = Math.floor(totalSpaces / 4);
        const remainingSpaces = totalSpaces % 4;
        leadingPart = '\t'.repeat(tabCount) + ' '.repeat(remainingSpaces);
        restPart = line.substring(leadingLength);
      } else {
        // No mixed leading whitespace, keep as is
        leadingPart = leading;
        restPart = line.substring(leadingLength);
      }
    }
    
    // Replace tabs with spaces in non-leading part to avoid mixing
    restPart = restPart.replace(/\t/g, ' ');
    
    return leadingPart + restPart;
  }).join('\n');
}


// Export fix functions for testing
export { 
  fixTrailingSpaces, 
  fixSpaceOnEmptyLines, 
  fixLeadingSpaces, 
  fixTabsToSpaces, 
  fixConsecutiveSpaces, 
  fixConsecutiveWhitespace, 
  fixMixedSpacesAndTabs 
};

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`Server error: ${error}\n`);
    process.exit(1);
  });
}