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
- `SPC_INSTEAD_TAB`: Spaces at beginning of line → Convert to tabs
- `TAB_INSTEAD_SPC`: Found tab when expecting space → Convert to space
- `CONSECUTIVE_SPC`: Two or more consecutive spaces → Reduce to single space
- `CONSECUTIVE_WS`: Two or more consecutive white spaces → Normalize whitespace
- `SPACE_EMPTY_LINE`: Space on empty line → Remove all whitespace
- `SPC_BEFORE_NL`: Space before newline → Remove trailing spaces
- `MIXED_SPACE_TAB`: Mixed spaces and tabs → Normalize to appropriate type

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

Based on the implementation of space/tab-related error fixes, here are key insights:

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
```typescript
// Pattern: Process content, track changes, return modified result
function fixSpecificError(content: string): string {
  const lines = content.split('\n');
  return lines.map(line => {
    // Skip empty lines when appropriate
    if (line.trim() === '') return line;
    
    // Identify the area to modify (leading whitespace vs content)
    const leadingWhitespace = line.match(/^[\t ]*/);
    const leadingPart = line.substring(0, leadingLength);
    const restPart = line.substring(leadingLength);
    
    // Apply specific fix logic
    // Return modified line
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
- **Order of operations**: Some fixes may conflict, apply in logical sequence
- **Regex precision**: Use specific patterns to avoid over-matching

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