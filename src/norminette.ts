import { execSync } from "child_process";
import { NorminetteError, NorminetteResult } from "./types.js";

export async function runNorminette(targetPath: string): Promise<NorminetteResult> {
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