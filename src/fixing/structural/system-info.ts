import { execSync } from 'child_process';

export interface SystemInfo {
  username: string;
  email: string;
  currentTime: string;
}

/**
 * Get the current system username
 * First tries $USER environment variable, then falls back to whoami command
 */
function getUsername(): string {
  // Try environment variable first
  const envUser = process.env.USER;
  if (envUser) {
    return envUser;
  }

  // Fall back to whoami command
  try {
    const username = execSync('whoami', { encoding: 'utf-8' }).trim();
    return username;
  } catch (error) {
    // Default fallback
    return 'user';
  }
}

/**
 * Get the user's email address
 * First tries $MAIL environment variable, then constructs from username
 */
function getEmail(username: string): string {
  // Try environment variable first
  const envMail = process.env.MAIL;
  if (envMail) {
    return envMail;
  }

  // Construct standard 42 email
  return `${username}@student.42.fr`;
}

/**
 * Format current date/time in 42 header format
 * Format: YYYY/MM/DD HH:MM:SS
 */
function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get all system information needed for 42 header generation
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  const username = getUsername();
  const email = getEmail(username);
  const currentTime = formatDateTime(new Date());

  return {
    username,
    email,
    currentTime
  };
}

/**
 * Get file creation time if available
 * Falls back to current time if not available
 */
export async function getFileCreationTime(filePath: string): Promise<string> {
  try {
    const { birthtime } = await import('fs').then(fs => 
      fs.promises.stat(filePath)
    );
    return formatDateTime(birthtime);
  } catch (error) {
    // Fall back to current time if file doesn't exist or stat fails
    return formatDateTime(new Date());
  }
}