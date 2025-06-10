import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export function generateClangFormatConfigString(): string {
  return `Language: Cpp
TabWidth: 4
IndentWidth: 4
UseTab: Always
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

export async function checkClangFormatAvailability(): Promise<boolean> {
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

export async function applyClangFormat(content: string): Promise<string> {
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

export function fixAllWhitespaceIssues(content: string): string {
  return content
    .replace(/[ \t]+$/gm, '')
    .replace(/^[ \t]+$/gm, '')
    .replace(/^    /gm, '\t')
    .replace(/  +/g, ' ');
}

export async function applyClangFormatWithFallback(content: string): Promise<{ formatted: string; usedClangFormat: boolean }> {
  try {
    const formatted = await applyClangFormat(content);
    return { formatted, usedClangFormat: true };
  } catch (error) {
    console.warn('clang-format failed, falling back to regex-based fixes:', error instanceof Error ? error.message : String(error));
    const fallbackFormatted = fixAllWhitespaceIssues(content);
    return { formatted: fallbackFormatted, usedClangFormat: false };
  }
}