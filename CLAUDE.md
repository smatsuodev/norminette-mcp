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
- Advanced automatic code fixing with comment preservation

**Key Fix Functions:**
- `fixAllWhitespaceIssues()` - Main comprehensive fix function
- `parseCodeSegments()` - Intelligently separates code, comments, and strings
- `fixCodeSegment()` - Applies fixes only to code portions
- `preserveWhitespaceInComments()` - Legacy helper for individual fix functions

**Key Interfaces:**
- `NorminetteError` - Structured representation of norminette error output
- `NorminetteResult` - Complete norminette execution result with status and errors

**Error Fixing Strategy:**
The auto-fix functionality uses a comprehensive approach with comment preservation:
- **Comment-aware parsing**: Preserves all whitespace in C-style comments (`/* */`) and line comments (`//`)
- **String literal preservation**: Maintains exact formatting within string literals
- **Intelligent whitespace fixing**: Applies different rules for indentation vs content
- **Comprehensive coverage**: Handles trailing spaces, empty lines, indentation, and spacing issues

## MCP Integration

This server is designed to be used with MCP clients. It communicates via stdio transport and expects to be launched as a subprocess by an MCP client application.

## Dependencies

- `@modelcontextprotocol/sdk` - Core MCP server functionality
- `js-yaml` - YAML output formatting
- Built-in Node.js modules for file operations and process execution

## Norminette Overview

The `norminette` directory contains the official 42 School norminette Python implementation (v3.3.59).

### Norminette Architecture

**Entry Point:**
- `norminette/__main__.py` - CLI entry point that handles argument parsing and file processing
- Supports checking single files, directories, or stdin input
- Provides multiple output formats and debug levels

**Core Components:**

1. **Lexer** (`norminette/lexer/`)
   - `lexer.py` - Tokenizes C/C header files into structured tokens
   - `tokens.py` - Token type definitions
   - `dictionary.py` - Keywords, operators, brackets definitions

2. **Parser & Rules** (`norminette/rules/`)
   - Two types of rules:
     - **Primary Rules** (prefixed with `Is`): Detect code patterns (e.g., `IsFuncDeclaration`, `IsControlStatement`)
     - **Check Rules** (prefixed with `Check`): Validate coding standards (e.g., `CheckLineLen`, `CheckSpacing`)
   - `rule.py` - Base classes for Primary and Check rules
   - 40+ specific rule implementations

3. **Registry** (`norminette/registry.py`)
   - Manages rule execution order and dependencies
   - Runs primary rules by priority, then dependent checks

4. **Context** (`norminette/context.py`)
   - Maintains parsing state and scope information
   - Tracks errors and token positions

5. **Error System** (`norminette/norm_error.py`)
   - 140+ specific error types with i18n support
   - Error codes like `LINE_TOO_LONG`, `FORBIDDEN_CHAR_NAME`, `TOO_MANY_FUNCS`

### Key Norminette Rules

**Naming Conventions:**
- Functions: lowercase with underscores
- Typedefs: must start with `t_`
- Structs: must start with `s_`
- Enums: must start with `e_`
- Unions: must start with `u_`
- Global variables: must start with `g_`
- Macros: UPPERCASE

**Code Structure:**
- Max 25 lines per function
- Max 5 functions per file
- Max 4 parameters per function
- Variable declarations at function start
- One instruction per line

**Formatting:**
- Tabs for indentation (not spaces)
- Max 80 characters per line
- Specific spacing around operators
- No trailing whitespace

### Test Structure

The `tests/` directory contains comprehensive test cases:

**Test Organization:**
- `tests/rules/samples/` - Test C files with expected outputs
  - `ok_*.c` - Valid code examples
  - `ko_*.c` - Invalid code examples
  - `test_*.c` - Specific feature tests
  - `*.out` - Expected norminette output

**Test Categories:**
- Spacing and indentation tests
- Function and variable naming tests
- Preprocessor directive tests
- Control structure tests
- Type declaration tests
- Comment formatting tests

**Test Framework:**
- Uses pytest for test execution
- `rules_generator_test.py` - Parameterized tests for all sample files
- Compares actual norminette output with expected `.out` files

## Norminette Error Auto-Fix Implementation Plan

### Auto-fixable Errors (by priority)

#### High Priority - Whitespace & Tab Errors
- ✅ `SPC_INSTEAD_TAB`: Spaces at beginning of line → Convert to tabs
- ✅ `TAB_INSTEAD_SPC`: Found tab when expecting space → Convert to space (preserves tabs before identifiers)
- ✅ `CONSECUTIVE_SPC`: Two or more consecutive spaces → Reduce to single space
- ✅ `CONSECUTIVE_WS`: Two or more consecutive white spaces → Normalize whitespace  
- ✅ `SPACE_EMPTY_LINE`: Space on empty line → Remove all whitespace
- ✅ `SPC_BEFORE_NL`: Space before newline → Remove trailing spaces
- ✅ `MIXED_SPACE_TAB`: Mixed spaces and tabs → Normalize to appropriate type
- ✅ `SPACE_BEFORE_FUNC`: Space before function name → Fixed through proper tab handling
- ✅ `SPACE_REPLACE_TAB`: Space where tab expected → Fixed through comprehensive whitespace handling

#### High Priority - Newline Errors
- `EMPTY_LINE_FILE_START`: Empty line at start of file → Remove leading empty lines
- `EMPTY_LINE_EOF`: Empty line at end of file → Remove trailing empty lines
- `CONSECUTIVE_NEWLINES`: Consecutive newlines → Reduce to single newline
- `BRACE_SHOULD_EOL`: Expected newline after brace → Add newline after brace
- `NEWLINE_PRECEDES_FUNC`: Functions must be separated by a newline → Add newline between functions
- `NL_AFTER_VAR_DECL`: Variable declarations must be followed by a newline → Add newline
- `NL_AFTER_PREPROC`: Preprocessor statement must be followed by a newline → Add newline

#### Medium Priority - Operator Spacing
- `SPC_BFR_OPERATOR`: Missing space before operator → Add space
- `SPC_AFTER_OPERATOR`: Missing space after operator → Add space
- `NO_SPC_BFR_OPR`: Extra space before operator → Remove space
- `NO_SPC_AFR_OPR`: Extra space after operator → Remove space

#### Medium Priority - Parenthesis/Bracket Spacing
- `SPC_AFTER_PAR`: Missing space after parenthesis → Add space
- `SPC_BFR_PAR`: Missing space before parenthesis → Add space
- `NO_SPC_AFR_PAR`: Extra space after parenthesis → Remove space
- `NO_SPC_BFR_PAR`: Extra space before parenthesis → Remove space

#### Medium Priority - Indentation
- `TOO_FEW_TAB`: Missing tabs for indent level → Add tabs
- `TOO_MANY_TAB`: Extra tabs for indent level → Remove tabs
- `TOO_MANY_WS`: Extra whitespaces for indent level → Fix indentation
- `PREPROC_BAD_INDENT`: Bad preprocessor indentation → Fix preprocessor indent

#### Low Priority - Preprocessor
- `PREPROC_NO_SPACE`: Missing space after preprocessor directive → Add space
- `INCLUDE_MISSING_SP`: Missing space between include and filename → Add space

#### Low Priority - Other Fixable
- `SPACE_AFTER_KW`: Missing space after keyword → Add space
- `RETURN_PARENTHESIS`: Return value must be in parenthesis → Wrap in parentheses
- `NO_ARGS_VOID`: Empty function argument requires void → Add void
- `LINE_TOO_LONG`: Line too long → Split line (requires careful implementation)

### Non-fixable Errors (excluded from auto-fix)

#### Structural/Logic Issues
- `TOO_MANY_LINES`: Function has more than 25 lines
- `TOO_MANY_FUNCS`: Too many functions in file
- `TOO_MANY_VARS_FUNC`: Too many variables declarations in a function
- `TOO_MANY_ARGS`: Function has more than 4 arguments
- `WRONG_SCOPE_VAR`: Variable declared in incorrect scope
- `VAR_DECL_START_FUNC`: Variable declaration not at start of function
- `FORBIDDEN_CS`: Forbidden control structure
- `ASSIGN_IN_CONTROL`: Assignment in control structure
- `VLA_FORBIDDEN`: Variable length array forbidden

#### Naming Convention Issues
- `FORBIDDEN_CHAR_NAME`: User defined identifiers should contain only lowercase characters, digits or '_'
- `USER_DEFINED_TYPEDEF`: User defined typedef must start with t_
- `STRUCT_TYPE_NAMING`: Structure name must start with s_
- `ENUM_TYPE_NAMING`: Enum name must start with e_
- `UNION_TYPE_NAMING`: Union name must start with u_
- `GLOBAL_VAR_NAMING`: Global variable must start with g_
- `MACRO_NAME_CAPITAL`: Macro name must be capitalized

#### Semantic Issues
- `MULT_ASSIGN_LINE`: Multiple assignations on a single line
- `MULT_DECL_LINE`: Multiple declarations on a single line
- `DECL_ASSIGN_LINE`: Declaration and assignation on a single line
- `MACRO_FUNC_FORBIDDEN`: Macro functions are forbidden
- `TERNARY_FBIDDEN`: Ternaries are forbidden
- `LABEL_FBIDDEN`: Label statements are forbidden
- `GOTO_FBIDDEN`: Goto statements are forbidden

#### Header Related
- `INVALID_HEADER`: Missing or invalid 42 header
- `HEADER_PROT_*`: Various header protection errors
- `INCLUDE_HEADER_ONLY`: .c file includes are forbidden
- `INCLUDE_START_FILE`: Include must be at the start of file

#### Lexical Analysis Errors
- `UNEXPECTED_EOF_*`: Various unexpected EOF errors
- `UNEXPECTED_EOL_CHR`: Unexpected EOL while parsing char
- `EMPTY_CHAR`: Empty character constant
- `CHAR_AS_STRING`: Character constants can have only one character
- `INVALID_*_INT`: Various invalid integer literal errors
- `UNKNOWN_ESCAPE`: Unknown escape sequence

## Development Tips & Best Practices

### Norminette Auto-Fix Implementation Lessons

Based on the comprehensive implementation including comment preservation and advanced whitespace handling, here are key insights:

#### 1. Error Analysis Strategy
- **Start with error categorization**: Group errors by fix complexity (auto-fixable vs manual)
- **Prioritize by impact**: Focus on high-frequency, low-risk fixes first
- **Reference official definitions**: Always check `norminette/norm_error.py` for exact error meanings

#### 2. Function Design Patterns
- **Single responsibility**: Each fix function handles one specific error type
- **Preserve structure**: Maintain line numbers and basic code structure
- **Line-by-line processing**: Most whitespace fixes work best line-by-line
- **Leading vs non-leading logic**: Distinguish between indentation and content whitespace

#### 3. Implementation Approach
**Comprehensive Fix Pattern (Recommended):**
```typescript
// Main pattern: Parse segments first, then apply fixes
function fixAllWhitespaceIssues(content: string): string {
  const segments = parseCodeSegments(content);
  return segments.map(segment => {
    if (segment.type === 'comment' || segment.type === 'string') {
      return segment.content; // Preserve exactly
    }
    return fixCodeSegment(segment.content); // Apply fixes
  }).join('');
}
```

**Legacy Line-by-Line Pattern:**
```typescript
// Pattern: Process content, track changes, return modified result
function fixSpecificError(content: string): string {
  const lines = content.split('\n');
  return lines.map(line => {
    // Skip empty lines when appropriate
    if (line.trim() === '') return line;
    
    // Use comment-aware helper
    const leadingWhitespace = line.match(/^[\t ]*/);
    const leadingPart = line.substring(0, leadingLength);
    const restPart = line.substring(leadingLength);
    
    return leadingPart + preserveWhitespaceInComments(restPart, fixLogic);
  }).join('\n');
}
```

#### 4. Testing Strategy
- **Export functions for testing**: Make fix functions exportable for unit tests
- **Test edge cases**: Empty lines, mixed whitespace, complex indentation
- **Verify expectations vs reality**: Debug actual output when tests fail
- **Integration tests**: Test function combinations on real code examples

#### 5. Common Pitfalls & Solutions
- **Tab vs Space counting**: Remember 1 tab = 4 spaces in norminette
- **Leading vs non-leading**: Different rules apply to indentation vs content
- **Comment preservation**: Multi-line comments require file-level parsing, not line-by-line
- **Identifier spacing**: Tabs before function/variable names must be preserved 
- **Order of operations**: Some fixes may conflict, apply in logical sequence
- **Regex precision**: Use specific patterns to avoid over-matching
- **42 Header preservation**: Headers contain carefully formatted ASCII art that must not be modified

#### 6. Debugging Tips
- **JSON.stringify() for visualization**: Shows invisible whitespace characters
- **Line-by-line analysis**: Debug each line transformation separately
- **Character counting**: Calculate exact space/tab conversions manually
- **Incremental testing**: Test one fix function at a time before combining

#### 7. File Structure Best Practices
- **Modular exports**: Export individual functions for testing
- **Conditional execution**: Only run main server when file is executed directly
- **Type definitions**: Maintain clear interfaces for error handling
- **Progressive enhancement**: Build fixes incrementally, test thoroughly

#### 8. Error Handling Patterns
- **Graceful degradation**: If a fix fails, don't break the entire process
- **Change tracking**: Log what fixes were applied for user feedback
- **Validation**: Re-run norminette to verify fixes worked
- **Rollback consideration**: Keep original content for potential reversion

### Testing Infrastructure
- **Unit tests**: Test individual fix functions with diverse inputs
- **Integration tests**: Verify fixes work together on complex code
- **Regression tests**: Ensure new fixes don't break existing functionality
- **Performance tests**: Monitor fix execution time on large files

### Future Development Guidelines
- **Error classification**: Continue categorizing errors by auto-fix feasibility
- **Priority ordering**: Implement high-impact, low-risk fixes first
- **User feedback**: Track which fixes are most valuable to users
- **Incremental improvement**: Add fix capabilities gradually with thorough testing

## Tips & Memory Notes

### Critical Implementation Details
- **Comment Preservation**: The `fixAllWhitespaceIssues()` function uses `parseCodeSegments()` to correctly handle multi-line comments (`/* */`) and line comments (`//`) without modifying their internal whitespace
- **Selective Tab Conversion**: Only converts tabs to spaces around operators/punctuation, preserves tabs before identifiers (functions, variables)
- **42 Header Compatibility**: Fully preserves the elaborate 42 School header comments with their ASCII art formatting
- **Comprehensive Coverage**: Handles `SPACE_BEFORE_FUNC`, `SPACE_REPLACE_TAB`, and other complex spacing errors that simple regex fixes cannot address

### Constraints & Limitations
- tips: @test/assets 以下をnorminette_fixのpathに与えることは禁止です
- The legacy individual fix functions are maintained for backward compatibility but the comprehensive approach is preferred
- Multi-line comment handling requires full-file parsing, making the solution more complex but more accurate

## npm Package Publishing Guide

### Publishing MCP Servers as npm Packages

Based on the implementation of this project, here are key insights for publishing MCP servers as npm packages:

#### 1. Package Configuration Essentials

**Executable Setup:**
- Add `bin` field in package.json to enable `npx` execution
- Use postbuild script to inject shebang line: `#!/usr/bin/env node`
- Ensure executable permissions with `chmod +x`

**Essential package.json fields:**
```json
{
  "name": "your-mcp-server",
  "version": "0.1.0",  // Start with 0.x for initial releases
  "bin": {
    "your-mcp-server": "dist/index.js"
  },
  "scripts": {
    "postbuild": "echo '#!/usr/bin/env node' | cat - dist/index.js > temp && mv temp dist/index.js && chmod +x dist/index.js",
    "prepublishOnly": "npm run build"
  },
  "files": ["dist/", "README.md", "LICENSE"],
  "type": "module"  // For ES modules
}
```

#### 2. File Management

**.npmignore essentials:**
- Source files (`src/`)
- Test files (`test/`)
- TypeScript config (`tsconfig.json`)
- Development files (`CLAUDE.md`, `.github/`)
- Git submodules (if any)

**Files to include:**
- Built JavaScript (`dist/`)
- README.md with MCP client configuration examples
- LICENSE file

#### 3. Documentation Requirements

**README.md must include:**
- Installation instructions for both `npx` and global install
- MCP client configuration examples (Claude Desktop, etc.)
- Tool descriptions and capabilities
- External dependencies (e.g., Python packages)

**Configuration example format:**
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["package-name"]
    }
  }
}
```

#### 4. Version Management with Git Tags

**Workflow:**
1. Use semantic versioning (start with 0.1.0)
2. Leverage npm version commands:
   - `npm version patch` (0.1.0 → 0.1.1)
   - `npm version minor` (0.1.1 → 0.2.0)
   - `npm version major` (0.2.0 → 1.0.0)
3. Push with tags: `git push && git push --tags`

**GitHub Actions for automated publishing:**
- Trigger on tag push (`tags: 'v*'`)
- Build, test, and publish automatically
- Create GitHub releases

#### 5. External Dependencies Handling

**For projects with external dependencies (like norminette):**
- Don't bundle external tools in npm package
- Document installation requirements clearly
- Consider Docker as alternative distribution method
- Use peerDependencies for npm packages

#### 6. Pre-publish Checklist

Before publishing:
- [ ] Verify package name availability: `npm view package-name`
- [ ] Test executable with `npx`: `npx ./`
- [ ] Ensure all metadata fields are complete
- [ ] Add comprehensive error handling
- [ ] Test with actual MCP clients
- [ ] Set up NPM_TOKEN in GitHub Secrets

#### 7. Common Pitfalls to Avoid

- **Missing shebang**: Won't work as CLI without `#!/usr/bin/env node`
- **Wrong file permissions**: Executable must have +x permission
- **Including unnecessary files**: Use .npmignore to keep package lean
- **Forgetting prepublishOnly**: Ensure fresh build before publish
- **Submodule issues**: Git submodules aren't included by npm

#### 8. Testing Before Release

```bash
# Build and test locally
npm run build
npm link
your-mcp-server  # Test global command

# Test with npx
npx ./  # From project root

# Dry run publish
npm publish --dry-run
```

### Release Process Summary

1. **Initial Setup**: Configure package.json, create docs, set up CI
2. **Version Management**: Use `npm version` + git tags
3. **Automated Publishing**: GitHub Actions on tag push
4. **Manual First Publish**: `npm publish` (subsequent releases automated)