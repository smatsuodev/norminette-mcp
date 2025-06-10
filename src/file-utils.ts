import * as fs from "fs";
import * as path from "path";

export function getAllCFiles(dir: string): string[] {
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