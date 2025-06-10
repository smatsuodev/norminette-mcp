import { TokenFormatterRule } from "./formatter.js";
import { NorminetteError } from "../../../types.js";
import { Token, TokenType } from "../../../lexer/token.js";

// SPACE_REPLACE_TAB: Convert spaces to tabs in variable declarations
export const spaceReplaceTabRule: TokenFormatterRule = {
  name: "SPACE_REPLACE_TAB",
  errorCodes: ["SPACE_REPLACE_TAB"],
  priority: 1,
  
  canFix(tokens: Token[], error: NorminetteError): boolean {
    // Find tokens on the error line
    const lineTokens = tokens.filter(token => token.lineno === error.line);
    
    // Pattern 1: TYPE SPACE IDENTIFIER (int x, char *ptr)
    // Pattern 2: TYPE SPACE MULT (int *, char **)
    // Pattern 3: RBRACE SPACE IDENTIFIER (} t_mystruct)
    // Pattern 4: CONST SPACE TYPE (const int)
    for (let i = 0; i < lineTokens.length - 2; i++) {
      const prevToken = lineTokens[i];
      const spaceToken = lineTokens[i + 1];
      const nextToken = lineTokens[i + 2];
      
      if (spaceToken.type === TokenType.SPACE) {
        // Pattern 1: TYPE SPACE IDENTIFIER/MULT
        if ((prevToken.type === TokenType.IDENTIFIER || 
             prevToken.type === 'INT' || 
             prevToken.type === 'CHAR' || 
             prevToken.type === 'VOID' ||
             prevToken.type === 'CONST') &&
            (nextToken.type === TokenType.IDENTIFIER || 
             nextToken.type === TokenType.MULT ||
             nextToken.type === TokenType.LPARENTHESIS)) {
          return true;
        }
        
        // Pattern 3: RBRACE SPACE IDENTIFIER (} t_mystruct)
        if (prevToken.type === TokenType.RBRACE &&
            nextToken.type === TokenType.IDENTIFIER) {
          return true;
        }
      }
    }
    
    return false;
  },
  
  apply(tokens: Token[], error: NorminetteError): Token[] {
    const result = [...tokens];
    
    // Find and replace space tokens with tabs based on patterns
    for (let i = 0; i < result.length - 2; i++) {
      const prevToken = result[i];
      const spaceToken = result[i + 1];
      const nextToken = result[i + 2];
      
      if (prevToken.lineno === error.line && 
          spaceToken.type === TokenType.SPACE) {
        
        // Pattern 1: TYPE SPACE IDENTIFIER/MULT/LPARENTHESIS
        if ((prevToken.type === TokenType.IDENTIFIER || 
             prevToken.type === 'INT' || 
             prevToken.type === 'CHAR' || 
             prevToken.type === 'VOID' ||
             prevToken.type === 'CONST') &&
            (nextToken.type === TokenType.IDENTIFIER || 
             nextToken.type === TokenType.MULT ||
             nextToken.type === TokenType.LPARENTHESIS)) {
          
          result[i + 1] = new Token(TokenType.TAB, spaceToken.pos, '\t');
          break;
        }
        
        // Pattern 3: RBRACE SPACE IDENTIFIER
        if (prevToken.type === TokenType.RBRACE &&
            nextToken.type === TokenType.IDENTIFIER) {
          
          result[i + 1] = new Token(TokenType.TAB, spaceToken.pos, '\t');
          break;
        }
      }
    }
    
    return result;
  }
};

// SPACE_BEFORE_FUNC: Add tab between return type and function name
export const spaceBeforeFuncRule: TokenFormatterRule = {
  name: "SPACE_BEFORE_FUNC",
  errorCodes: ["SPACE_BEFORE_FUNC"],
  priority: 1,
  
  canFix(tokens: Token[], error: NorminetteError): boolean {
    // Find tokens on the error line
    const lineTokens = tokens.filter(token => token.lineno === error.line);
    
    // Look for pattern: TYPE SPACE IDENTIFIER LPARENTHESIS
    for (let i = 0; i < lineTokens.length - 3; i++) {
      const typeToken = lineTokens[i];
      const spaceToken = lineTokens[i + 1];
      const funcToken = lineTokens[i + 2];
      const parenToken = lineTokens[i + 3];
      
      if ((typeToken.type === TokenType.IDENTIFIER || typeToken.type === 'INT') &&
          spaceToken.type === TokenType.SPACE &&
          funcToken.type === TokenType.IDENTIFIER &&
          parenToken.type === TokenType.LPARENTHESIS) {
        return true;
      }
    }
    
    return false;
  },
  
  apply(tokens: Token[], error: NorminetteError): Token[] {
    const result = [...tokens];
    
    // Find and replace space tokens between return type and function name
    for (let i = 0; i < result.length - 3; i++) {
      const typeToken = result[i];
      const spaceToken = result[i + 1];
      const funcToken = result[i + 2];
      const parenToken = result[i + 3];
      
      if (typeToken.lineno === error.line &&
          (typeToken.type === TokenType.IDENTIFIER || typeToken.type === 'INT') &&
          spaceToken.type === TokenType.SPACE &&
          funcToken.type === TokenType.IDENTIFIER &&
          parenToken.type === TokenType.LPARENTHESIS) {
        
        // Replace space with tab
        result[i + 1] = new Token(TokenType.TAB, spaceToken.pos, '\t');
        break;
      }
    }
    
    return result;
  }
};

// Export all available rules
export const defaultFormattingRules: TokenFormatterRule[] = [
  spaceReplaceTabRule,
  spaceBeforeFuncRule
];