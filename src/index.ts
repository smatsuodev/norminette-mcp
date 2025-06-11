#!/usr/bin/env node

import { startMCPServer } from "./mcp/server.js";

// Re-export all public APIs
export * from "./core/index.js";
export * from "./fixing/index.js";
export * from "./lexer/index.js";
export type { NorminetteError, NorminetteResult, FixResult } from "./types.js";

async function main() {
  await startMCPServer();
}

main().catch((error) => {
  process.stderr.write(`Server error: ${error}\n`);
  process.exit(1);
});