# norminette-mcp

MCP (Model Context Protocol) server for the 42 School norminette coding standard checker.

This package provides an MCP server that exposes norminette functionality through standardized tools, allowing AI assistants and other MCP clients to check and automatically fix code according to 42 School coding standards.

## Features

- **Check code**: Run norminette on files or directories and get structured results
- **Auto-fix**: Automatically fix common norminette errors (whitespace, indentation, spacing)
- **MCP integration**: Works with any MCP-compatible client (Claude Desktop, VS Code, etc.)

## Installation

### As an MCP server

```bash
# Run directly with npx
npx norminette-mcp

# Or install globally
npm install -g norminette-mcp
norminette-mcp
```

### Requirements

- Node.js >= 18
- Python 3.x (for norminette)
- norminette Python package installed:
  ```bash
  pip install norminette
  ```

> **Note**: This MCP server requires the norminette Python package to be installed separately. The norminette tool is not bundled with this npm package.

## Usage with MCP Clients

### Claude Desktop Configuration

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "norminette": {
      "command": "npx",
      "args": ["norminette-mcp"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "norminette": {
      "command": "norminette-mcp"
    }
  }
}
```

### Available Tools

Once connected, the MCP client will have access to these tools:

#### `norminette_check`
Check files or directories for norminette compliance.

```yaml
# Example response
/path/to/file.c:
  status: Error
  errors:
    - line: 10
      column: 1
      error: "SPACE_BEFORE_FUNC"
      message: "space before function name"
```

#### `norminette_fix`
Automatically fix common norminette errors in files.

Supported auto-fixes:
- Trailing spaces and tabs
- Empty lines at start/end of file
- Consecutive spaces/tabs
- Space/tab conversion errors
- Indentation issues

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [42 School](https://42.fr/) for the norminette tool
- [Anthropic](https://anthropic.com/) for the MCP protocol