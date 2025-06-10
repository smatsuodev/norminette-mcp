# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-06-10

### Added
- Initial release of norminette-mcp
- MCP server implementation for norminette integration
- `norminette_check` tool for checking files/directories
- `norminette_fix` tool for auto-fixing common errors:
  - Trailing spaces and tabs
  - Empty lines at start/end of file
  - Consecutive spaces/tabs
  - Space/tab conversion errors
  - Indentation issues
- Support for `npx norminette-mcp` execution
- Comprehensive error parsing and YAML output
- Comment-aware code fixing to preserve formatting in comments and strings

### Technical Details
- TypeScript implementation with ES modules
- MCP SDK integration for standardized tool communication
- Automatic shebang injection for CLI usage
- GitHub Actions workflow for automated npm publishing on tag push

[Unreleased]: https://github.com/smatsuodev/norminette-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/smatsuodev/norminette-mcp/releases/tag/v0.1.0