import { NorminetteError } from './types.js';
import { generate42Header, has42Header, update42Header } from './header-generator.js';

/**
 * Interface for structural fixers that modify file structure/content
 * These are different from token-based formatters as they may add/remove content
 */
export interface StructuralFixer {
  name: string;
  errorCodes: string[];
  priority: number;
  canFix(error: NorminetteError, content: string, filePath: string): boolean;
  apply(content: string, filePath: string, error: NorminetteError): Promise<string>;
}

/**
 * Fix INVALID_HEADER error by adding or updating 42 header
 */
export const headerFixer: StructuralFixer = {
  name: "HEADER_FIXER",
  errorCodes: ["INVALID_HEADER"],
  priority: 1, // Run first as it modifies the beginning of the file
  
  canFix(error: NorminetteError, content: string, filePath: string): boolean {
    // We can fix INVALID_HEADER for .c and .h files
    return error.error_code === "INVALID_HEADER" && 
           (filePath.endsWith('.c') || filePath.endsWith('.h'));
  },
  
  async apply(content: string, filePath: string, error: NorminetteError): Promise<string> {
    // Check if file already has a 42 header (might be malformed)
    if (has42Header(content)) {
      // Update existing header
      return update42Header(content, filePath);
    }
    
    // Generate new header
    const header = await generate42Header(filePath);
    
    // Add header to the beginning of the file
    // If file starts with a comment, we need to be careful
    const lines = content.split('\n');
    
    // Check if first line is a comment that might be a malformed header
    if (lines.length > 0 && lines[0].startsWith('/*')) {
      // Look for the end of the first comment block
      let endIndex = -1;
      for (let i = 0; i < Math.min(lines.length, 15); i++) {
        if (lines[i].includes('*/')) {
          endIndex = i;
          break;
        }
      }
      
      if (endIndex >= 0 && endIndex < 15) {
        // Remove the old comment block and replace with new header
        const remainingContent = lines.slice(endIndex + 1).join('\n');
        return header + (remainingContent.trim() ? '\n' + remainingContent : '');
      }
    }
    
    // Just prepend the header
    return header + '\n' + content;
  }
};

/**
 * Collection of all structural fixers
 */
export const structuralFixers: StructuralFixer[] = [
  headerFixer
];

/**
 * Apply structural fixes to content based on errors
 */
export async function applyStructuralFixes(
  content: string, 
  filePath: string, 
  errors: NorminetteError[]
): Promise<{ content: string; applied: string[] }> {
  let result = content;
  const applied: string[] = [];
  
  // Sort fixers by priority
  const sortedFixers = [...structuralFixers].sort((a, b) => a.priority - b.priority);
  
  // Apply each fixer
  for (const fixer of sortedFixers) {
    // Find errors this fixer can handle
    const fixableErrors = errors.filter(error => 
      fixer.errorCodes.includes(error.error_code) &&
      fixer.canFix(error, result, filePath)
    );
    
    // Apply fixes
    for (const error of fixableErrors) {
      try {
        result = await fixer.apply(result, filePath, error);
        applied.push(`${fixer.name}:${error.error_code}`);
      } catch (e) {
        console.error(`Failed to apply ${fixer.name} for ${error.error_code}:`, e);
      }
    }
  }
  
  return { content: result, applied };
}