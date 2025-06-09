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

  // Apply comprehensive whitespace fixes that preserve comments
  const fixedContent = fixAllWhitespaceIssues(content);
  if (fixedContent !== content) {
    content = fixedContent;
    fixes.push("Fixed whitespace issues while preserving comments");
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    fixResults.fixes_applied.push({
      file: filePath,
      fixes: fixes
    });
  }
}

// Comprehensive whitespace fix function that handles multi-line comments correctly
function fixAllWhitespaceIssues(content: string): string {
  // First, identify and mark all comment and string regions
  const segments = parseCodeSegments(content);
  
  let result = '';
  
  for (const segment of segments) {
    if (segment.type === 'comment' || segment.type === 'string') {
      // Preserve comments and strings exactly as they are
      result += segment.content;
    } else {
      // Apply fixes to code segments
      result += fixCodeSegment(segment.content);
    }
  }
  
  return result;
}

interface CodeSegment {
  type: 'code' | 'comment' | 'string';
  content: string;
}

function parseCodeSegments(content: string): CodeSegment[] {
  const segments: CodeSegment[] = [];
  let i = 0;
  
  while (i < content.length) {
    // Check for line comment
    if (i < content.length - 1 && content[i] === '/' && content[i + 1] === '/') {
      const start = i;
      // Find end of line
      while (i < content.length && content[i] !== '\n') {
        i++;
      }
      if (i < content.length) i++; // Include the newline
      segments.push({ type: 'comment', content: content.substring(start, i) });
      continue;
    }
    
    // Check for block comment
    if (i < content.length - 1 && content[i] === '/' && content[i + 1] === '*') {
      const start = i;
      i += 2;
      // Find end of block comment
      while (i < content.length - 1) {
        if (content[i] === '*' && content[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      // If we didn't find closing */, include rest of content
      if (i >= content.length - 1 && !(content[i - 1] === '/' && content[i - 2] === '*')) {
        i = content.length;
      }
      segments.push({ type: 'comment', content: content.substring(start, i) });
      continue;
    }
    
    // Check for string literal
    if (content[i] === '"' || content[i] === "'") {
      const quote = content[i];
      const start = i;
      i++;
      
      // Find end of string, handling escape sequences
      while (i < content.length) {
        if (content[i] === '\\') {
          i += 2; // Skip escaped character
          continue;
        }
        if (content[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      segments.push({ type: 'string', content: content.substring(start, i) });
      continue;
    }
    
    // Regular code - find next special character
    const start = i;
    while (i < content.length) {
      if ((i < content.length - 1 && content[i] === '/' && (content[i + 1] === '/' || content[i + 1] === '*')) ||
          content[i] === '"' || content[i] === "'") {
        break;
      }
      i++;
    }
    
    if (i > start) {
      segments.push({ type: 'code', content: content.substring(start, i) });
    }
  }
  
  return segments;
}

function fixCodeSegment(content: string): string {
  const lines = content.split('\n');
  
  return lines.map(line => {
    // Remove trailing spaces and tabs
    line = line.replace(/[ \t]+$/, '');
    
    // Handle empty lines (remove any whitespace)
    if (line.trim() === '') {
      return '';
    }
    
    // Convert leading spaces to tabs (4 spaces = 1 tab)
    const leadingWhitespace = line.match(/^[ \t]*/);
    if (leadingWhitespace) {
      const leading = leadingWhitespace[0];
      let leadingPart = '';
      
      // Convert mixed/space indentation to tabs
      if (leading.length > 0) {
        const totalSpaces = leading.split('').reduce((count, char) => {
          return count + (char === '\t' ? 4 : 1);
        }, 0);
        const tabCount = Math.floor(totalSpaces / 4);
        const remainingSpaces = totalSpaces % 4;
        leadingPart = '\t'.repeat(tabCount) + ' '.repeat(remainingSpaces);
      }
      
      // Get the non-leading part
      let restPart = line.substring(leading.length);
      
      // Only convert tabs to spaces around operators and punctuation, not before identifiers
      // Keep tabs between types/keywords and identifiers
      restPart = restPart.replace(/\t(?=[ \t]*[+\-*/%=<>!&|,;(){}\[\]."])/g, ' ');
      
      // Fix consecutive spaces (2 or more spaces become 1 space), but preserve single tabs
      restPart = restPart.replace(/  +/g, ' ');
      
      return leadingPart + restPart;
    }
    
    return line;
  }).join('\n');
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
    
    // Process the non-leading part while preserving comments and strings
    const leadingPart = line.substring(0, leadingLength);
    const restPart = line.substring(leadingLength);
    
    // Use helper function to preserve whitespace in comments and strings
    const transformedRest = preserveWhitespaceInComments(restPart, (segment) => {
      // Convert all tabs to spaces in non-leading positions (except in comments/strings)
      return segment.replace(/\t/g, ' ');
    });
    
    return leadingPart + transformedRest;
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
    
    // Fix consecutive spaces in the non-leading part while preserving comments
    const leadingPart = line.substring(0, leadingLength);
    const restPart = line.substring(leadingLength);
    
    // Use helper function to preserve whitespace in comments and strings
    const transformedRest = preserveWhitespaceInComments(restPart, (segment) => {
      // Replace consecutive spaces with single space
      return segment.replace(/ {2,}/g, ' ');
    });
    
    return leadingPart + transformedRest;
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
    
    // Fix consecutive whitespace in the non-leading part while preserving comments
    const leadingPart = line.substring(0, leadingLength);
    const restPart = line.substring(leadingLength);
    
    // Use helper function to preserve whitespace in comments and strings
    const transformedRest = preserveWhitespaceInComments(restPart, (segment) => {
      return segment.replace(/[ \t]{2,}/g, match => {
        // If it's all spaces, reduce to one space
        if (match.match(/^ +$/)) return ' ';
        // If it's all tabs, reduce to one tab
        if (match.match(/^\t+$/)) return '\t';
        // If mixed, convert to single space
        return ' ';
      });
    });
    
    return leadingPart + transformedRest;
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
    
    // Use helper function to preserve whitespace in comments and strings
    const transformedRest = preserveWhitespaceInComments(restPart, (segment) => {
      // Convert all tabs to spaces in non-leading positions (except in comments/strings)
      return segment.replace(/\t/g, ' ');
    });
    
    return leadingPart + transformedRest;
  }).join('\n');
}


// Helper function to preserve whitespace in comments
function preserveWhitespaceInComments(text: string, transform: (text: string) => string): string {
  // Track comment state
  let result = '';
  let i = 0;
  
  while (i < text.length) {
    // Check for start of line comment
    if (i < text.length - 1 && text[i] === '/' && text[i + 1] === '/') {
      // Line comment - preserve everything after //
      result += text.substring(i);
      break;
    }
    
    // Check for start of block comment
    if (i < text.length - 1 && text[i] === '/' && text[i + 1] === '*') {
      // Find end of block comment
      const commentStart = i;
      i += 2;
      while (i < text.length - 1) {
        if (text[i] === '*' && text[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      // If we didn't find closing */, treat rest of line as comment
      if (i >= text.length - 1 && !(text[i - 1] === '/' && text[i - 2] === '*')) {
        i = text.length;
      }
      
      // Preserve the entire comment as-is
      result += text.substring(commentStart, i);
      continue;
    }
    
    // Check if we're inside a string literal
    if (text[i] === '"' || text[i] === "'") {
      const quote = text[i];
      const stringStart = i;
      i++;
      
      // Find end of string, handling escape sequences
      while (i < text.length) {
        if (text[i] === '\\') {
          i += 2; // Skip escaped character
          continue;
        }
        if (text[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      
      // Preserve the entire string as-is
      result += text.substring(stringStart, i);
      continue;
    }
    
    // Not in comment or string - find next comment or string start
    let nextSpecial = text.length;
    
    // Look for next comment or string
    for (let j = i; j < text.length - 1; j++) {
      if ((text[j] === '/' && (text[j + 1] === '/' || text[j + 1] === '*')) ||
          text[j] === '"' || text[j] === "'") {
        nextSpecial = j;
        break;
      }
    }
    
    // Transform the non-comment, non-string part
    const segment = text.substring(i, nextSpecial);
    result += transform(segment);
    i = nextSpecial;
  }
  
  return result;
}

// Export fix functions for testing
export { 
  fixTrailingSpaces, 
  fixSpaceOnEmptyLines, 
  fixLeadingSpaces, 
  fixTabsToSpaces, 
  fixConsecutiveSpaces, 
  fixConsecutiveWhitespace, 
  fixMixedSpacesAndTabs,
  preserveWhitespaceInComments,
  fixAllWhitespaceIssues,
  parseCodeSegments,
  fixCodeSegment,
  fixNorminetteErrors,
  runNorminette
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