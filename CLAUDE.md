# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides tools for working with the 42 School norminette coding standard checker. The server exposes two main tools through the MCP protocol:

1. **norminette_check** - Executes norminette on files/directories and returns structured results in YAML format
2. **norminette_fix** - Automatically fixes common norminette errors (trailing spaces, empty lines, spacing issues)

## Development Commands

- `npm run build` - Compile TypeScript to JavaScript (required before running)
- `npm start` - Start the MCP server (requires build first)
- `npm run dev` - Run the server in development mode with tsx

## Architecture

The codebase follows a single-file MCP server architecture:

**Core Components:**
- MCP Server setup with stdio transport for communication
- Tool handlers for norminette operations
- Error parsing and YAML output formatting
- Automatic code fixing for common norminette violations

**Key Interfaces:**
- `NorminetteError` - Structured representation of norminette error output
- `NorminetteResult` - Complete norminette execution result with status and errors

**Error Fixing Strategy:**
The auto-fix functionality targets common formatting issues:
- Trailing whitespace removal
- Empty line normalization
- Basic spacing corrections around operators and braces

## MCP Integration

This server is designed to be used with MCP clients. It communicates via stdio transport and expects to be launched as a subprocess by an MCP client application.

## Dependencies

- `@modelcontextprotocol/sdk` - Core MCP server functionality
- `js-yaml` - YAML output formatting
- Built-in Node.js modules for file operations and process execution