import * as fs from "fs";
import { runNorminette } from "../core/norminette.js";
import { applyClangFormatWithFallback } from "./formatting/clang-format.js";
import { NorminetteFormatter } from "./formatting/token-based/formatter.js";
import { defaultFormattingRules } from "./formatting/token-based/rules.js";
import { getAllCFiles } from "../core/file-utils.js";
import { FixResult } from "../types.js";
import { applyStructuralFixes } from "./structural/structural-fixes.js";

const formatter = new NorminetteFormatter();

// Initialize formatter with default rules
for (const rule of defaultFormattingRules) {
  formatter.addRule(rule);
}

export async function fixNorminetteErrors(targetPath: string): Promise<FixResult> {
  const norminetteResult = await runNorminette(targetPath);
  const fixResults: FixResult = {
    original_errors: norminetteResult.errors.length,
    fixes_applied: [],
    remaining_errors: [],
    final_error_count: 0,
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

async function fixFileErrors(filePath: string, fixResults: FixResult): Promise<void> {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  const fixes: string[] = [];

  // Stage 1: Apply structural fixes (e.g., 42 header)
  const initialErrors = await runNorminette(filePath);
  if (initialErrors.errors.length > 0) {
    const structuralResult = await applyStructuralFixes(content, filePath, initialErrors.errors);
    if (structuralResult.content !== content) {
      content = structuralResult.content;
      fixes.push(...structuralResult.applied.map(fix => `Applied ${fix}`));
    }
  }

  // Stage 2: Apply clang-format
  const formatResult = await applyClangFormatWithFallback(content);
  if (formatResult.formatted !== content) {
    content = formatResult.formatted;
    if (formatResult.usedClangFormat) {
      fixes.push("Applied clang-format for 42 School compliance");
    } else {
      fixes.push("Applied fallback whitespace fixes");
    }
  }

  // Stage 3: Apply norminette-specific formatter
  // Write intermediate content to get accurate norminette errors
  fs.writeFileSync(filePath, content);
  const errors = await runNorminette(filePath);
  if (errors.errors.length > 0) {
    const formattedContent = formatter.format(content, errors.errors);
    if (formattedContent !== content) {
      content = formattedContent;
      fixes.push("Applied norminette-specific formatting rules");
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