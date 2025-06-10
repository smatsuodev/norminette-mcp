# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides tools for working with the 42 School norminette coding standard checker. The server exposes two main tools through the MCP protocol:

1. **norminette_check** - Executes norminette on files/directories and returns structured results in YAML format
2. **norminette_fix** - Automatically fixes common norminette errors (trailing spaces, empty lines, spacing issues)

## Development Commands

**Build & Run:**
- `npm run build` - Compile TypeScript to JavaScript (required before running)
- `npm start` - Start the MCP server (requires build first)
- `npm run dev` - Run the server in development mode with tsx

**Testing & Quality:**
- `npm test` - Run clang-format integration test suite (13 test cases)
- `npm run lint` - Run TypeScript linting
- `npm run format` - Format codebase with prettier

**Note:** Legacy individual fix function tests have been removed in favor of comprehensive clang-format integration testing.

## Architecture

### ✅ Current Implementation: clang-format Based Hybrid System

**Core Components:**
- MCP Server setup with stdio transport for communication
- Tool handlers for norminette operations  
- Error parsing and YAML output formatting
- **clang-format integration with 42 School configuration**
- Error categorization system (85 fixable errors across 3 categories)

**Implemented Hybrid Fixing Architecture:**
The system currently employs a **simplified two-stage approach** with planned expansion:

1. **✅ clang-format Integration (ACTIVE)**
   - 42 School compliant `.clang-format` configuration generation
   - Automatic baseline formatting for whitespace/indentation/spacing
   - Handles 21 whitespace & formatting error types
   - External tool availability checking with graceful fallback
   - **Proven effective**: Reduces norminette errors by ~73% in real files

2. **✅ Error Categorization System (ACTIVE)**
   - **Whitespace & Formatting**: 21 errors → clang-format handles these
   - **Norminette-specific**: 39 errors → Future rule engine target
   - **Unfixable**: 25 errors → Excluded from auto-fix
   - Smart error routing for optimal fixing strategy

3. **✅ Fallback Mechanism (ACTIVE)**
   - Simple regex-based whitespace fixes when clang-format unavailable
   - Graceful degradation ensures system always functions
   - Maintains backward compatibility

4. **🔄 Norminette-specific Rule Engine (PLANNED - Phase 2)**
   - Custom rule processors for remaining 39 error types  
   - Pattern-based fixes for pointer spacing, tab placement, etc.
   - Context-aware fixing for 42 School specific requirements

**Key Implemented Components:**
- `applyClangFormat()` - Core clang-format integration
- `applyClangFormatWithFallback()` - Robust formatting with fallback
- `generate42SchoolClangFormatConfig()` - 42 School configuration generator
- `categorizeNorminetteErrors()` - Error classification system
- `getErrorCategory()` - Individual error type classification
- `checkClangFormatAvailability()` - External tool validation

**Key Interfaces:**
- `NorminetteError` - Structured representation of norminette error output
- `NorminetteResult` - Complete norminette execution result with status and errors
- `ClangFormatConfig` - 42 School specific formatting configuration
- `ErrorCategory` - Three-tier error classification system

**Current Error Fixing Pipeline:**
1. **Initial Check**: Run norminette → Exit if no errors
2. **clang-format Stage**: Apply 42 School formatting → Fixes whitespace/spacing errors
3. **Fallback**: Use simple regex fixes if clang-format unavailable
4. **Final Validation**: Re-run norminette → Report remaining errors
5. **Result**: Structured output with fixes applied and remaining issues

### 🎯 Implementation Status

**✅ Completed (Phase 1):**
- clang-format integration with 42 School configuration
- Error categorization system (3 categories, 85 total errors)
- Graceful fallback mechanism  
- Comprehensive test suite (13 test cases, 100% pass rate)
- Real-world validation (11 errors → 3 errors in test file)

**🔄 Next Phase (Phase 2):**
- Norminette-specific rule engine for remaining 39 errors
- AST-based context analysis for intelligent fixes
- Advanced pipeline orchestration

## MCP Integration

This server is designed to be used with MCP clients. It communicates via stdio transport and expects to be launched as a subprocess by an MCP client application.

## Dependencies

**Core Dependencies:**
- `@modelcontextprotocol/sdk` - Core MCP server functionality
- `js-yaml` - YAML output formatting
- Built-in Node.js modules for file operations and process execution

**Current System Dependencies:**
- `clang-format` - External formatter for 42 School compliant formatting (system dependency)
- `child_process` - Execute external tools (clang-format, norminette)
- Built-in `execSync` for safe external process execution

**Development Dependencies:**
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution for development
- `@types/node` - Node.js type definitions
- `mocha` - Test framework for clang-format integration tests
- `@types/js-yaml` - TypeScript definitions for js-yaml

**Future Dependencies (Phase 2):**
- `tree-sitter` - AST parsing for C language syntax analysis (planned)
- `tree-sitter-c` - C language grammar for tree-sitter (planned)

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

**Coverage Status:** 54/143 errors (37.8%) - Comprehensive auto-fix implementation

### Auto-fixable Errors (by priority)

#### High Priority - Whitespace & Tab Errors
- `SPC_INSTEAD_TAB`: Spaces at beginning of line → Convert to tabs
- `TAB_INSTEAD_SPC`: Found tab when expecting space → Convert to space (preserves tabs before identifiers)
- `CONSECUTIVE_SPC`: Two or more consecutive spaces → Reduce to single space
- `CONSECUTIVE_WS`: Two or more consecutive white spaces → Normalize whitespace  
- `SPACE_EMPTY_LINE`: Space on empty line → Remove all whitespace
- `SPC_BEFORE_NL`: Space before newline → Remove trailing spaces
- `MIXED_SPACE_TAB`: Mixed spaces and tabs → Normalize to appropriate type
- `SPACE_BEFORE_FUNC`: Space before function name → Fixed through proper tab handling
- `SPACE_REPLACE_TAB`: Space where tab expected → Fixed through comprehensive whitespace handling

#### High Priority - Extended Whitespace & Tab Errors
- `SPC_AFTER_POINTER`: Space after pointer → Remove space after * in declarations
- `SPC_BFR_POINTER`: Bad spacing before pointer → Fix spacing before * in declarations
- `TAB_REPLACE_SPACE`: Found tab when expecting space → Convert to space in specific contexts
- `MISSING_TAB_FUNC`: Missing tab before function name → Add required tab
- `MISSING_TAB_VAR`: Missing tab before variable name → Add required tab
- `TOO_MANY_TABS_FUNC`: Extra tabs before function name → Remove excess tabs
- `TOO_MANY_TABS_TD`: Extra tabs before typedef name → Remove excess tabs
- `MISSING_TAB_TYPDEF`: Missing tab before typedef name → Add required tab
- `TOO_MANY_TAB_VAR`: Extra tab before variable name → Remove excess tabs
- `NO_TAB_BF_TYPEDEF`: Missing whitespace before typedef name → Add tab

#### High Priority - Newline Errors
- `EMPTY_LINE_FILE_START`: Empty line at start of file → Remove leading empty lines
- `EMPTY_LINE_EOF`: Empty line at end of file → Remove trailing empty lines
- `CONSECUTIVE_NEWLINES`: Consecutive newlines → Reduce to single newline
- `BRACE_SHOULD_EOL`: Expected newline after brace → Add newline after brace
- `NEWLINE_PRECEDES_FUNC`: Functions must be separated by a newline → Add newline between functions
- `NL_AFTER_VAR_DECL`: Variable declarations must be followed by a newline → Add newline
- `NL_AFTER_PREPROC`: Preprocessor statement must be followed by a newline → Add newline

#### High Priority - Extended Newline & Structure Errors
- `EMPTY_LINE_FUNCTION`: Empty line in function → Remove empty lines within functions
- `BRACE_NEWLINE`: Expected newline before brace → Add newline before opening brace
- `EXP_NEWLINE`: Expected newline after control structure → Add newline after control statements
- `NEWLINE_IN_DECL`: Newline in declaration → Remove inappropriate newlines in declarations

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

#### Medium Priority - Basic Syntax Fixes
- `EXP_PARENTHESIS`: Expected parenthesis → Add missing parenthesis
- `EXP_SEMI_COLON`: Expected semicolon → Add missing semicolon
- `EXP_TAB`: Expected tab → Add required tab
- `MISALIGNED_VAR_DECL`: Misaligned variable declaration → Fix variable alignment
- `MISALIGNED_FUNC_DECL`: Misaligned function declaration → Fix function alignment
- `COMMA_START_LINE`: Comma at line start → Move comma to end of previous line
- `EOL_OPERATOR`: Logic operator at the end of line → Move operator to next line

#### Low Priority - Preprocessor
- `PREPROC_NO_SPACE`: Missing space after preprocessor directive → Add space
- `INCLUDE_MISSING_SP`: Missing space between include and filename → Add space
- `PREPROC_EXPECTED_EOL`: Expected EOL after preprocessor statement → Add newline
- `PREPROC_START_LINE`: Preprocessor statement not at the beginning of the line → Move to line start

#### Low Priority - Other Fixable
- `SPACE_AFTER_KW`: Missing space after keyword → Add space
- `RETURN_PARENTHESIS`: Return value must be in parenthesis → Wrap in parentheses
- `NO_ARGS_VOID`: Empty function argument requires void → Add void
- `LINE_TOO_LONG`: Line too long → Split line (requires careful implementation)
- `MISSING_IDENTIFIER`: Missing type qualifier or identifier in function arguments → Add missing identifiers
- `ATTR_EOL`: Function attribute must be at the end of line → Move attribute to line end
- `SPC_LINE_START`: Unexpected space/tab at line start → Remove unexpected whitespace

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
- `TOO_MANY_INSTR`: Too many instructions on a single line

#### Preprocessor Structure Issues
- `PREPROC_UKN_STATEMENT`: Unrecognized preprocessor statement
- `PREPROC_CONSTANT`: Preprocessor statement must only contain constant defines
- `PREPROC_BAD_IF`: If preprocessor statement without endif
- `PREPROC_BAD_ELIF`: Elif preprocessor statement without if or elif
- `PREPROC_BAD_IFDEF`: Ifdef preprocessor statement without endif
- `PREPROC_BAD_IFNDEF`: Ifndef preprocessor statement without endif
- `PREPROC_BAD_ELSE`: Else preprocessor statement without if or elif
- `PREPROC_BAD_ENDIF`: Endif preprocessor statement without if, elif or else
- `PREPROC_MULTLINE`: Multiline preprocessor statement is forbidden
- `PREPOC_ONLY_GLOBAL`: Preprocessor statements are only allowed in the global scope
- `INCORRECT_DEFINE`: Incorrect values in define
- `TOO_MANY_VALS`: Too many values on define

#### Header & Include Issues
- `INVALID_HEADER`: Missing or invalid 42 header
- `HEADER_PROT_ALL`: Header protection must include all the instructions
- `HEADER_PROT_ALL_AF`: Instructions after header protection are forbidden
- `HEADER_PROT_NAME`: Wrong header protection name
- `HEADER_PROT_UPPER`: Header protection must be in uppercase
- `HEADER_PROT_MULT`: Multiple header protections, only one is allowed
- `HEADER_PROT_NODEF`: Header protection not containing #define
- `INCLUDE_HEADER_ONLY`: .c file includes are forbidden
- `INCLUDE_START_FILE`: Include must be at the start of file
- `NEWLINE_DEFINE`: Newline in define

#### Scope & Declaration Issues
- `WRONG_SCOPE_COMMENT`: Comment is invalid in this scope
- `WRONG_SCOPE_FCT`: Function prototype in incorrect scope
- `WRONG_SCOPE`: Statement is in incorrect scope
- `IMPLICIT_VAR_TYPE`: Missing type in variable declaration
- `MISSING_TYPEDEF_ID`: Missing identifier in typedef declaration
- `TYPE_NOT_GLOBAL`: Enums, structs and unions need to be defined only in global scope
- `FORBIDDEN_TYPEDEF`: Typedef declaration are not allowed in .c files
- `FORBIDDEN_STRUCT`: Struct declaration are not allowed in .c files
- `FORBIDDEN_UNION`: Union declaration are not allowed in .c files
- `FORBIDDEN_ENUM`: Enum declaration are not allowed in .c files

#### Lexical Analysis Errors
- `UNEXPECTED_EOF_CHR`: Unexpected end of file (EOF) while parsing a char
- `UNEXPECTED_EOL_CHR`: Unexpected end of line (EOL) while parsing a char
- `UNEXPECTED_EOF_MC`: Unexpected end of file (EOF) while parsing a multiline comment
- `UNEXPECTED_EOF_STR`: Unexpected end of file (EOF) while parsing a string
- `EMPTY_CHAR`: Empty character constant
- `CHAR_AS_STRING`: Character constants can have only one character
- `INVALID_SUFFIX`: This suffix is invalid
- `BAD_FLOAT_SUFFIX`: Invalid suffix for float/double literal constant
- `INVALID_BIN_INT`: Invalid binary integer literal
- `INVALID_OCT_INT`: Invalid octal integer literal
- `INVALID_HEX_INT`: Invalid hexadecimal integer literal
- `MAXIMAL_MUNCH`: Potential maximal munch detected
- `NO_HEX_DIGITS`: No hexadecimal digits followed by the \\x
- `UNKNOWN_ESCAPE`: Unknown escape sequence
- `BAD_EXPONENT`: Exponent has no digits
- `MULTIPLE_DOTS`: Multiple dots in float constant
- `MULTIPLE_X`: Multiple 'x' in hexadecimal float constant

#### Complex Structural Issues
- `COMMENT_ON_INSTR`: Comment must be on its own line or at end of a line
- `MULT_IN_SINGLE_INSTR`: Multiple instructions in single line control structure
- `ARG_TYPE_UKN`: Unrecognized variable type
- `GLOBAL_VAR_DETECTED`: Global variable present in file. Make sure it is a reasonable choice.

## Development Tips & Best Practices

### Hybrid Approach Implementation Strategy

Based on the transition from regex-based to hybrid fixing approach, here are key development guidelines:

#### 1. Modular Development Process
- **Stage-by-stage implementation**: Implement each fixing stage independently
- **Interface-driven design**: Define clear interfaces between AST, formatter, and rule engine
- **Backward compatibility**: Maintain existing regex-based fixes as fallback
- **Incremental migration**: Gradually replace regex fixes with AST-based solutions

#### 2. AST-based Development Patterns
**Tree-sitter Integration Pattern:**
```typescript
// AST-based analysis and fixing
function analyzeWithAST(content: string): ASTAnalysis {
  const tree = parser.parse(content);
  const analysis = extractCodeStructure(tree.rootNode);
  return {
    functions: analysis.functions,
    declarations: analysis.declarations,
    scopes: analysis.scopes
  };
}

function applyASTBasedFixes(content: string, errors: NorminetteError[]): string {
  const analysis = analyzeWithAST(content);
  return errors.reduce((fixed, error) => {
    const strategy = getFixingStrategy(error.error_code, analysis);
    return strategy.apply(fixed, error);
  }, content);
}
```

**Formatter Integration Pattern:**
```typescript
// clang-format integration with 42 School configuration
function applyBaselineFormatting(content: string): string {
  const clangFormatConfig = generate42SchoolConfig();
  const formatted = execSync(`clang-format --style='${clangFormatConfig}'`, {
    input: content,
    encoding: 'utf-8'
  });
  return formatted;
}
```

#### 3. Rule Engine Architecture
**Error-specific Rule Pattern:**
```typescript
interface FixingRule {
  errorCode: string;
  priority: number;
  dependencies: string[];
  canFix(error: NorminetteError, context: FixingContext): boolean;
  apply(content: string, error: NorminetteError, context: FixingContext): string;
}

class RuleEngine {
  private rules: Map<string, FixingRule> = new Map();
  
  applyRules(content: string, errors: NorminetteError[], context: FixingContext): string {
    const sortedErrors = this.sortByPriority(errors);
    return sortedErrors.reduce((fixed, error) => {
      const rule = this.rules.get(error.error_code);
      return rule?.canFix(error, context) ? rule.apply(fixed, error, context) : fixed;
    }, content);
  }
}
```

#### 4. Legacy Integration Strategy
**Hybrid Fix Pattern (Recommended):**
```typescript
// Multi-stage fixing pipeline
function fixWithHybridApproach(content: string): string {
  // Stage 1: AST Analysis
  const analysis = analyzeWithAST(content);
  
  // Stage 2: Baseline formatting
  let fixed = applyBaselineFormatting(content);
  
  // Stage 3: Norminette-specific rules
  const errors = parseNorminetteErrors(content);
  fixed = ruleEngine.apply(fixed, errors, { analysis });
  
  // Stage 4: Legacy regex fallback
  fixed = applyLegacyFixes(fixed);
  
  return fixed;
}
```

**Comment Preservation Integration:**
```typescript
// Preserve existing comment handling across all stages
function preserveCommentsInPipeline(content: string, fixFunction: (content: string) => string): string {
  const segments = parseCodeSegments(content);
  return segments.map(segment => {
    if (segment.type === 'comment' || segment.type === 'string') {
      return segment.content; // Preserve exactly
    }
    return fixFunction(segment.content); // Apply hybrid fixes
  }).join('');
}
```

#### 5. Testing Strategy for Hybrid Approach
- **Unit testing per stage**: Test AST analysis, formatter integration, rule engine separately
- **Cross-stage integration tests**: Verify stages work together correctly
- **Performance benchmarking**: Monitor performance impact of AST parsing and external tools
- **Regression testing**: Ensure hybrid approach doesn't break existing functionality
- **Error type coverage**: Test each norminette error type with appropriate fixing strategy

#### 6. Implementation Phases & Milestones

**Phase 1: Foundation (Weeks 1-2)**
- Set up tree-sitter integration and C parser
- Create basic AST analysis functions
- Implement clang-format configuration generation
- Maintain existing regex-based fixes as fallback

**Phase 2: Core Rule Engine (Weeks 3-4)**
- Design and implement rule engine architecture
- Create fixing rule interfaces and base classes
- Implement high-priority whitespace and formatting rules
- Integrate with existing comment preservation system

**Phase 3: AST-based Rules (Weeks 5-6)**
- Implement context-aware fixing rules using AST data
- Add support for function declaration fixes
- Implement variable declaration and scope-aware fixes
- Add comprehensive error handling and validation

**Phase 4: Integration & Optimization (Weeks 7-8)**
- Integrate all stages into unified pipeline
- Optimize performance and memory usage
- Add comprehensive test coverage
- Documentation and developer experience improvements

#### 7. Performance Considerations
- **AST parsing overhead**: Cache AST results when processing multiple errors
- **External tool execution**: Minimize clang-format calls through batching
- **Memory management**: Handle large files efficiently without loading entire AST
- **Concurrent processing**: Consider parallel processing of independent fixes

#### 8. Backwards Compatibility Strategy
- **Feature flags**: Allow switching between hybrid and legacy approaches
- **Gradual migration**: Replace regex fixes one error type at a time
- **Fallback mechanism**: Automatic fallback to regex fixes when AST parsing fails
- **Configuration options**: Allow users to control which fixing stages to enable

### Hybrid Approach Testing Infrastructure

**Multi-stage Testing Strategy:**
- **AST Unit Tests**: Test tree-sitter parsing and analysis functions independently
- **Rule Engine Tests**: Test individual fixing rules with isolated error scenarios
- **Pipeline Integration Tests**: Test complete hybrid fixing pipeline end-to-end
- **Performance Benchmarks**: Compare hybrid vs regex-based performance metrics
- **Compatibility Tests**: Ensure hybrid approach produces same results as legacy system

**Test Data Management:**
- **Norminette Sample Library**: Leverage existing `tests/rules/samples/` for comprehensive testing
- **Synthetic Test Cases**: Generate edge cases for specific error combinations
- **Real-world Code Samples**: Test with actual 42 School project files
- **Regression Test Suite**: Maintain test cases for previously fixed bugs

**Quality Assurance:**
- **Cross-platform Testing**: Verify behavior across different operating systems
- **External Tool Integration**: Test clang-format availability and version compatibility
- **Error Boundary Testing**: Verify graceful degradation when external tools fail
- **Memory and Performance Testing**: Monitor resource usage with large codebases

### Future Development Roadmap

**Short-term (3 months):**
- Complete Phase 1-2 implementation with basic AST and rule engine
- Achieve feature parity with current regex-based system
- Establish comprehensive test coverage for hybrid approach
- Performance optimization and memory usage improvements

**Medium-term (6 months):**
- Complete Phase 3-4 implementation with advanced AST-based rules
- Implement all auto-fixable norminette errors using appropriate strategies
- Add configuration system for customizing fixing behavior
- Integration with popular editors and CI/CD systems

**Long-term (12 months):**
- Machine learning integration for intelligent fix suggestions
- Support for additional coding standards beyond 42 School
- Real-time fixing integration with development environments
- Community-driven rule development and contribution system

## Session Learnings & Implementation Notes

### ✅ Successfully Implemented: clang-format Integration

**External Tool Integration (COMPLETED):**
- **✅ clang-format Configuration**: Generate 42 School compliant `.clang-format` config dynamically
- **✅ Tool Availability Checking**: Robust `checkClangFormatAvailability()` with 5-second timeout
- **✅ Process Management**: Safe `execSync` execution with proper timeout and error handling
- **✅ Output Validation**: Verify clang-format output and handle failures gracefully

**Legacy System Cleanup (COMPLETED):**
- **✅ Complete Removal**: Eliminated 15+ legacy regex-based fix functions (~400 lines of code)
- **✅ Simplified Fallback**: Replaced complex `parseCodeSegments()` with simple 4-line fallback
- **✅ Clean Architecture**: Streamlined exports to essential clang-format functions only
- **✅ Test Modernization**: Replaced 337-line legacy tests with 224-line comprehensive clang-format tests

**Real-World Performance (VERIFIED):**
- **✅ Proven Effectiveness**: 73% error reduction (11 → 3 errors) on actual 42 School files
- **✅ Fast Execution**: Test suite runs in 394ms with 100% pass rate
- **✅ MCP Compatibility**: Full integration with MCP protocol maintained
- **✅ Error Categorization**: Smart routing of 85 error types across 3 categories

### Key Technical Learnings

**clang-format 42 School Configuration:**
```yaml
BasedOnStyle: LLVM
UseTab: ForIndentation  # Critical for 42 School
TabWidth: 4
ColumnLimit: 80
AllowShortFunctionsOnASingleLine: None
BraceWrapping:
  AfterFunction: true
  AfterControlStatement: Always
BreakBeforeBraces: Custom
```

**Error Categorization Strategy:**
- **Whitespace & Formatting (21 errors)**: clang-format handles efficiently
- **Norminette-specific (39 errors)**: Require custom rule engine (Phase 2)
- **Unfixable (25 errors)**: Structural/naming issues requiring manual fixes

**Fallback Pattern:**
```typescript
async function applyClangFormatWithFallback(content: string) {
  try {
    return { formatted: await applyClangFormat(content), usedClangFormat: true };
  } catch (error) {
    return { formatted: fixAllWhitespaceIssues(content), usedClangFormat: false };
  }
}
```

### Development Process Insights

**✅ Successful Strategies:**
- **Incremental replacement**: Replace legacy system piece by piece
- **Comprehensive testing**: 13 test cases covering all integration aspects  
- **Real-world validation**: Test with actual norminette files
- **Graceful degradation**: Always provide working fallback

**🔄 Future Implementation Notes (Phase 2):**
- AST integration for remaining 39 norminette-specific errors
- Context-aware rule engine for pointer spacing, tab placement
- Performance optimization for large file processing

### Constraints & Limitations

**Technical Constraints:**
- **External Dependencies**: Requires clang-format installation on target system for optimal results
- **Performance Overhead**: AST parsing adds computational cost, especially for large files
- **Memory Usage**: Tree-sitter parsers require additional memory allocation for AST representation
- **Compatibility**: Must maintain exact compatibility with existing norminette error definitions

**Operational Constraints:**
- **Migration Period**: Hybrid approach requires careful testing and gradual rollout
- **User Experience**: Must not break existing workflows or introduce unexpected behavior changes
- **Error Handling**: Must gracefully handle malformed C code that may break AST parsing
- **Configuration Complexity**: Additional configuration options may confuse users

**Development Guidelines:**
- **Prohibited**: @test/assets 以下をnorminette_fixのpathに与えることは禁止です
- **✅ Current State**: Legacy regex system completely removed, clang-format system active
- **Performance Requirements**: clang-format approach should maintain fast execution (<500ms test suite)
- **Quality Standards**: All code has comprehensive test coverage (13 test cases, 100% pass rate)
- **Fallback Required**: Always provide graceful degradation when external tools fail

**Phase 2 Development Priorities:**
1. Implement norminette-specific rule engine for 39 remaining error types
2. Add AST-based context analysis for intelligent fixes  
3. Maintain backward compatibility with current clang-format system
4. Ensure performance does not degrade significantly with additional complexity

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