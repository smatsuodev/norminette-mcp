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

  // Apply clang-format with fallback to preserve existing functionality
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

// Simple fallback function for when clang-format is not available
function fixAllWhitespaceIssues(content: string): string {
  return content
    .replace(/[ \t]+$/gm, '') // Remove trailing whitespace
    .replace(/^[ \t]+$/gm, '') // Remove whitespace on empty lines
    .replace(/^    /gm, '\t') // Convert 4 spaces to tabs at line start
    .replace(/  +/g, ' '); // Fix consecutive spaces (basic fallback)
}

// ===== HYBRID APPROACH: CLANG-FORMAT INTEGRATION =====

interface ClangFormatConfig {
  BasedOnStyle: string;
  IndentWidth: number;
  UseTab: string;
  TabWidth: number;
  ColumnLimit: number;
  AllowShortFunctionsOnASingleLine: string;
  AllowShortIfStatementsOnASingleLine: string;
  AllowShortLoopsOnASingleLine: boolean;
  BraceWrapping: {
    AfterFunction: boolean;
    AfterControlStatement: string;
    AfterStruct: boolean;
    AfterEnum: boolean;
    AfterUnion: boolean;
  };
  BreakBeforeBraces: string;
  SpaceAfterCStyleCast: boolean;
  SpaceBeforeParens: string;
  SpacesInParentheses: boolean;
  SpacesInSquareBrackets: boolean;
  AlignConsecutiveDeclarations: boolean;
  AlignConsecutiveAssignments: boolean;
}

function generate42SchoolClangFormatConfig(): ClangFormatConfig {
  return {
    BasedOnStyle: "LLVM",
    IndentWidth: 4,
    UseTab: "ForIndentation", // Use tabs for indentation, spaces for alignment
    TabWidth: 4,
    ColumnLimit: 80, // 42 School rule: max 80 characters per line
    AllowShortFunctionsOnASingleLine: "None", // Functions must be on multiple lines
    AllowShortIfStatementsOnASingleLine: "Never", // Control structures on multiple lines
    AllowShortLoopsOnASingleLine: false,
    BraceWrapping: {
      AfterFunction: true, // Opening brace on new line for functions
      AfterControlStatement: "Always", // Opening brace on new line for control statements
      AfterStruct: true,
      AfterEnum: true,
      AfterUnion: true
    },
    BreakBeforeBraces: "Custom",
    SpaceAfterCStyleCast: false, // No space after cast: (int)value
    SpaceBeforeParens: "ControlStatements", // Space before parentheses in control statements
    SpacesInParentheses: false, // No spaces inside parentheses
    SpacesInSquareBrackets: false, // No spaces inside square brackets
    AlignConsecutiveDeclarations: false, // Don't align variable declarations
    AlignConsecutiveAssignments: false // Don't align assignments
  };
}

function generateClangFormatConfigString(): string {
  const config = generate42SchoolClangFormatConfig();
  const yamlConfig = yaml.dump(config, { indent: 2 });
  return yamlConfig;
}

async function checkClangFormatAvailability(): Promise<boolean> {
  try {
    execSync('clang-format --version', { 
      encoding: 'utf-8', 
      timeout: 5000,
      stdio: 'pipe' // Suppress output
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
    
    // Create temporary config file
    const tempConfigPath = path.join(process.cwd(), '.clang-format-temp');
    fs.writeFileSync(tempConfigPath, configString);
    
    try {
      // Apply clang-format with the custom config using --style=file
      const formatted = execSync(`clang-format --style=file:.clang-format-temp`, {
        input: content,
        encoding: 'utf-8',
        timeout: 10000,
        cwd: process.cwd()
      });
      
      return formatted;
    } finally {
      // Clean up temporary config file
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
    // Fallback to existing regex-based fixes
    console.warn('clang-format failed, falling back to regex-based fixes:', error instanceof Error ? error.message : String(error));
    const fallbackFormatted = fixAllWhitespaceIssues(content);
    return { formatted: fallbackFormatted, usedClangFormat: false };
  }
}

// ===== ERROR CATEGORIZATION SYSTEM =====

interface ErrorCategory {
  whitespace_and_formatting: string[];
  norminette_specific: string[];
  unfixable: string[];
}

function categorizeNorminetteErrors(): ErrorCategory {
  return {
    // Errors that clang-format can help fix
    whitespace_and_formatting: [
      'SPC_INSTEAD_TAB',
      'TAB_INSTEAD_SPC', 
      'CONSECUTIVE_SPC',
      'CONSECUTIVE_WS',
      'SPACE_EMPTY_LINE',
      'SPC_BEFORE_NL',
      'MIXED_SPACE_TAB',
      'EMPTY_LINE_FILE_START',
      'EMPTY_LINE_EOF',
      'CONSECUTIVE_NEWLINES',
      'TOO_FEW_TAB',
      'TOO_MANY_TAB',
      'TOO_MANY_WS',
      'SPC_BFR_OPERATOR',
      'SPC_AFTER_OPERATOR',
      'NO_SPC_BFR_OPR',
      'NO_SPC_AFR_OPR',
      'SPC_AFTER_PAR',
      'SPC_BFR_PAR',
      'NO_SPC_AFR_PAR',
      'NO_SPC_BFR_PAR'
    ],
    
    // Errors that need norminette-specific rule engine
    norminette_specific: [
      'SPACE_BEFORE_FUNC',
      'SPACE_REPLACE_TAB',
      'SPC_AFTER_POINTER',
      'SPC_BFR_POINTER',
      'TAB_REPLACE_SPACE',
      'MISSING_TAB_FUNC',
      'MISSING_TAB_VAR',
      'TOO_MANY_TABS_FUNC',
      'TOO_MANY_TABS_TD',
      'MISSING_TAB_TYPDEF',
      'TOO_MANY_TAB_VAR',
      'NO_TAB_BF_TYPEDEF',
      'BRACE_SHOULD_EOL',
      'NEWLINE_PRECEDES_FUNC',
      'NL_AFTER_VAR_DECL',
      'NL_AFTER_PREPROC',
      'EMPTY_LINE_FUNCTION',
      'BRACE_NEWLINE',
      'EXP_NEWLINE',
      'NEWLINE_IN_DECL',
      'PREPROC_BAD_INDENT',
      'EXP_PARENTHESIS',
      'EXP_SEMI_COLON',
      'EXP_TAB',
      'MISALIGNED_VAR_DECL',
      'MISALIGNED_FUNC_DECL',
      'COMMA_START_LINE',
      'EOL_OPERATOR',
      'PREPROC_NO_SPACE',
      'INCLUDE_MISSING_SP',
      'PREPROC_EXPECTED_EOL',
      'PREPROC_START_LINE',
      'SPACE_AFTER_KW',
      'RETURN_PARENTHESIS',
      'NO_ARGS_VOID',
      'LINE_TOO_LONG',
      'MISSING_IDENTIFIER',
      'ATTR_EOL',
      'SPC_LINE_START'
    ],
    
    // Errors that cannot be automatically fixed
    unfixable: [
      'TOO_MANY_LINES',
      'TOO_MANY_FUNCS',
      'TOO_MANY_VARS_FUNC',
      'TOO_MANY_ARGS',
      'WRONG_SCOPE_VAR',
      'VAR_DECL_START_FUNC',
      'FORBIDDEN_CS',
      'ASSIGN_IN_CONTROL',
      'VLA_FORBIDDEN',
      'FORBIDDEN_CHAR_NAME',
      'USER_DEFINED_TYPEDEF',
      'STRUCT_TYPE_NAMING',
      'ENUM_TYPE_NAMING',
      'UNION_TYPE_NAMING',
      'GLOBAL_VAR_NAMING',
      'MACRO_NAME_CAPITAL',
      'MULT_ASSIGN_LINE',
      'MULT_DECL_LINE',
      'DECL_ASSIGN_LINE',
      'MACRO_FUNC_FORBIDDEN',
      'TERNARY_FBIDDEN',
      'LABEL_FBIDDEN',
      'GOTO_FBIDDEN',
      'TOO_MANY_INSTR',
      'INVALID_HEADER'
    ]
  };
}

function getErrorCategory(errorCode: string): 'whitespace_and_formatting' | 'norminette_specific' | 'unfixable' {
  const categories = categorizeNorminetteErrors();
  
  if (categories.whitespace_and_formatting.includes(errorCode)) {
    return 'whitespace_and_formatting';
  }
  if (categories.norminette_specific.includes(errorCode)) {
    return 'norminette_specific';
  }
  return 'unfixable';
}

// Export functions for testing and external use
export { 
  // Core norminette functionality
  fixNorminetteErrors,
  runNorminette,
  // clang-format integration
  generate42SchoolClangFormatConfig,
  generateClangFormatConfigString,
  checkClangFormatAvailability,
  applyClangFormat,
  applyClangFormatWithFallback,
  // Error categorization system
  categorizeNorminetteErrors,
  getErrorCategory,
  // Simple fallback function
  fixAllWhitespaceIssues
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