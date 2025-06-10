import path from 'path';
import { getSystemInfo, getFileCreationTime } from './system-info.js';

/**
 * 42 Header structure with all required fields
 */
interface Header42 {
  filename: string;
  username: string;
  email: string;
  createdDate: string;
  createdBy: string;
  updatedDate: string;
  updatedBy: string;
}

/**
 * Generate a valid 42 header as an array of lines
 */
function generateHeaderLines(header: Header42): string[] {
  // Each line must be exactly 80 characters including the comment markers
  const lines: string[] = [];
  
  // Line 1: Top border
  lines.push('/* ************************************************************************** */');
  
  // Line 2: Empty line
  lines.push('/*                                                                            */');
  
  // Line 3: Title decoration
  lines.push('/*                                                        :::      ::::::::   */');
  
  // Line 4: Filename line (80 chars total)
  // Truncate filename if too long to fit in 51 chars
  const filename = header.filename.length > 51 ? header.filename.substring(0, 51) : header.filename;
  const filenamePadded = filename.padEnd(51);
  lines.push(`/*   ${filenamePadded}:+:      :+:    :+:   */`);
  
  // Line 5: Empty decoration line
  lines.push('/*                                                    +:+ +:+         +:+     */');
  
  // Line 6: Author line (80 chars total)
  const authorInfo = `${header.username} <${header.email}>`;
  const authorPadded = authorInfo.padEnd(43);
  lines.push(`/*   By: ${authorPadded}+#+  +:+       +#+        */`);
  
  // Line 7: Empty decoration line
  lines.push('/*                                                +#+#+#+#+#+   +#+           */');
  
  // Line 8: Created line (80 chars total)
  const createdInfo = `${header.createdDate} by ${header.createdBy}`;
  const createdPadded = createdInfo.padEnd(41);
  lines.push(`/*   Created: ${createdPadded}#+#    #+#             */`);
  
  // Line 9: Updated line (80 chars total)
  const updatedInfo = `${header.updatedDate} by ${header.updatedBy}`;
  const updatedPadded = updatedInfo.padEnd(39);
  lines.push(`/*   Updated: ${updatedPadded} ###   ########.fr       */`);
  
  // Line 10: Empty line
  lines.push('/*                                                                            */');
  
  // Line 11: Bottom border
  lines.push('/* ************************************************************************** */');
  
  return lines;
}

/**
 * Generate a 42 header for a given file
 */
export async function generate42Header(filePath: string): Promise<string> {
  // Get system information
  const systemInfo = await getSystemInfo();
  
  // Get filename
  const filename = path.basename(filePath);
  
  // Get file creation time (or current time for new files)
  const createdDate = await getFileCreationTime(filePath);
  
  // Build header structure
  const header: Header42 = {
    filename,
    username: systemInfo.username,
    email: systemInfo.email,
    createdDate,
    createdBy: systemInfo.username,
    updatedDate: systemInfo.currentTime,
    updatedBy: systemInfo.username
  };
  
  // Generate header lines
  const headerLines = generateHeaderLines(header);
  
  // Join with newlines and add final newline
  return headerLines.join('\n') + '\n';
}

/**
 * Check if content already has a 42 header
 * Returns true if the first 11 lines match the 42 header pattern
 */
export function has42Header(content: string): boolean {
  const lines = content.split('\n');
  
  if (lines.length < 11) {
    return false;
  }
  
  // Check first and last border lines
  if (lines[0] !== '/* ************************************************************************** */' ||
      lines[10] !== '/* ************************************************************************** */') {
    return false;
  }
  
  // Check general structure
  const headerPattern = /^\/\*.*\*\/$/;
  for (let i = 0; i < 11; i++) {
    if (!headerPattern.test(lines[i])) {
      return false;
    }
  }
  
  // Check specific patterns for key lines
  const patterns = {
    2: /\s+:::      ::::::::   \*\/$/,
    3: /^\/\*   .{51}:\+:      :\+:    :\+:   \*\/$/,
    5: /^\/\*   By: .{43}\+#\+  \+:\+       \+#\+        \*\/$/,
    7: /^\/\*   Created: .{41}#\+#    #\+#             \*\/$/,
    8: /^\/\*   Updated: .{39} ###   ########\.fr       \*\/$/,
  };
  
  for (const [lineNum, pattern] of Object.entries(patterns)) {
    if (!pattern.test(lines[Number(lineNum)])) {
      return false;
    }
  }
  
  return true;
}

/**
 * Extract header information from existing 42 header
 * Returns null if header is invalid
 */
export function extractHeaderInfo(content: string): Header42 | null {
  if (!has42Header(content)) {
    return null;
  }
  
  const lines = content.split('\n');
  
  try {
    // Extract filename from line 4
    const fileMatch = lines[3].match(/^\/\*   (.+?)\s+:\+:/);
    const filename = fileMatch ? fileMatch[1].trim() : '';
    
    // Extract author info from line 6
    const authorMatch = lines[5].match(/^\/\*   By: (.+?) <(.+?)>\s+\+#\+/);
    const username = authorMatch ? authorMatch[1].trim() : '';
    const email = authorMatch ? authorMatch[2].trim() : '';
    
    // Extract created info from line 8
    const createdMatch = lines[7].match(/^\/\*   Created: (\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) by (.+?)\s+#\+#/);
    const createdDate = createdMatch ? createdMatch[1] : '';
    const createdBy = createdMatch ? createdMatch[2].trim() : '';
    
    // Extract updated info from line 9
    const updatedMatch = lines[8].match(/^\/\*   Updated: (\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) by (.+?)\s+###/);
    const updatedDate = updatedMatch ? updatedMatch[1] : '';
    const updatedBy = updatedMatch ? updatedMatch[2].trim() : '';
    
    return {
      filename,
      username,
      email,
      createdDate,
      createdBy,
      updatedDate,
      updatedBy
    };
  } catch (error) {
    return null;
  }
}

/**
 * Update an existing 42 header with new information
 * Preserves creation info, updates the updated fields
 */
export async function update42Header(content: string, filePath: string): Promise<string> {
  const existingHeader = extractHeaderInfo(content);
  if (!existingHeader) {
    // No valid header to update, generate new one
    return generate42Header(filePath);
  }
  
  // Get current system info
  const systemInfo = await getSystemInfo();
  
  // Update only the updated fields
  const updatedHeader: Header42 = {
    ...existingHeader,
    updatedDate: systemInfo.currentTime,
    updatedBy: systemInfo.username
  };
  
  // Generate new header
  const headerLines = generateHeaderLines(updatedHeader);
  
  // Replace old header with new one
  const lines = content.split('\n');
  const newLines = [...headerLines, ...lines.slice(11)];
  
  return newLines.join('\n');
}