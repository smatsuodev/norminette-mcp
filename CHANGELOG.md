# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.1] - 2025-06-11

### Fixed
- Removed conditional execution check in main entry point to ensure server always starts
- Fixed test import paths to use main index.js exports instead of direct module imports

## [0.4.0] - 2025-06-11

### Added
- **Lexer-based Token Formatter System**: Complete C language lexer with precise token-based formatting rules
  - `CLexer` class with full C tokenization support and position tracking
  - `NorminetteFormatter` engine for token-level error fixing with source reconstruction
  - Implemented formatter rules: `SPACE_BEFORE_FUNC`, `SPACE_REPLACE_TAB`, `SPC_AFTER_POINTER`, `SPC_BFR_POINTER`, `MISSING_TAB_FUNC`, `MISSING_TAB_VAR`
- **Structural Fixes Framework**: File-level modification system for complex errors
  - 42 header auto-generation and update functionality
  - System info retrieval for proper header metadata
  - `INVALID_HEADER` error auto-fix implementation
- **Comprehensive Accuracy Measurement Tools**: 
  - Automated accuracy testing with log rotation
  - Performance analysis against official norminette test suite (103 files)
  - Detailed before/after comparison with YAML output

### Changed
- **Major Architecture Refactoring**: Function-based modular directory structure
  - `src/core/`: Basic functionality (norminette execution, file operations)
  - `src/fixing/`: All repair logic (structural, formatting, token-based)
  - `src/lexer/`: Complete C language tokenization system
  - `src/mcp/`: Protocol handling separated from business logic
- **Multi-Stage Fixing Pipeline**: Intelligent error routing system
  1. Structural fixes (42 headers, file-level issues)
  2. clang-format integration (whitespace & formatting)
  3. Token-based formatter (norminette-specific errors)
  4. Final validation and reporting
- Enhanced test coverage: 25 comprehensive tests with 100% pass rate (~363ms execution)

### Technical Details
- **Complete C Lexer**: Position-aware tokenization with newline tracking
- **Token Formatter Architecture**: Rule-based system with `canFix()` and `apply()` methods
- **Circular Dependency Resolution**: Clean import hierarchy without ES module cycles
- **Error Categorization**: 85 norminette errors across 3 categories with smart routing
- **Real-world Validation**: 100% error reduction on complex test files
- **Performance Optimization**: Maintained fast execution with enhanced functionality

## [0.3.0] - 2025-06-10

### Added
- **Function separation auto-fix**: Automatically insert proper spacing between function definitions
- **File ending newline enforcement**: Ensure all files end with a newline character
- Enhanced clang-format integration with 42 School specific configuration:
  - `SeparateDefinitionBlocks: Always` for function spacing
  - `InsertNewlineAtEOF: true` for file ending compliance
  - `MaxEmptyLinesToKeep: 1` for consistent empty line handling

### Changed
- Improved clang-format configuration to handle more norminette errors automatically
- Enhanced auto-fix capabilities to cover `NEWLINE_PRECEDES_FUNC` and `EMPTY_LINE_EOF` errors
- Updated documentation to include clang-format installation requirements

### Technical Details
- Consolidated duplicate clang-format configuration keys for cleaner config generation
- Maintained backward compatibility with fallback regex-based fixes when clang-format unavailable
- All tests passing (10 test cases in ~380ms)

## [0.2.0] - 2025-06-10

### Added
- Comprehensive clang-format integration with 42 School compliant configuration
- Hybrid auto-fix system combining clang-format with custom rule engine
- Phase 2a rule engine implementation with 6 high-priority norminette-specific rules:
  - `SPACE_BEFORE_FUNC`: Tab between return type and function name
  - `SPACE_REPLACE_TAB`: Tab in variable declarations
  - `SPC_AFTER_POINTER`: Remove space after pointer asterisk
  - `SPC_BFR_POINTER`: Fix spacing before pointer asterisk
  - `MISSING_TAB_FUNC`: Add missing tab before function name
  - `MISSING_TAB_VAR`: Add missing tab before variable name

### Changed
- Replaced legacy regex-based fixes with robust clang-format integration
- Streamlined codebase by removing 400+ lines of legacy fix functions
- Enhanced test suite with 30 comprehensive test cases (13 clang-format + 17 rule engine)

### Technical Details
- External tool integration with graceful fallback mechanism
- Error categorization system for 85 norminette error types across 3 categories
- Real-world performance: 73% error reduction with clang-format, 100% with hybrid system
- Execution time: ~540ms for full test suite

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

[Unreleased]: https://github.com/smatsuodev/norminette-mcp/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/smatsuodev/norminette-mcp/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/smatsuodev/norminette-mcp/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/smatsuodev/norminette-mcp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/smatsuodev/norminette-mcp/releases/tag/v0.1.0