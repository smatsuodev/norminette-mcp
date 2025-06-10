import { NorminetteError } from "../../../types.js";
import { CLexer } from "../../../lexer/lexer.js";
import { Token, TokenType } from "../../../lexer/token.js";

export interface TokenFormatterRule {
  name: string;
  errorCodes: string[];
  priority: number;
  canFix(tokens: Token[], error: NorminetteError): boolean;
  apply(tokens: Token[], error: NorminetteError): Token[];
}

export class NorminetteFormatter {
  private rules: TokenFormatterRule[] = [];

  constructor() {
    // Initialize with default rules (empty for now)
  }

  addRule(rule: TokenFormatterRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  format(content: string, errors: NorminetteError[]): string {
    // Step 1: Tokenize the input
    const lexer = new CLexer(content);
    let tokens = lexer.tokenize();

    // Step 2: Apply formatting rules to tokens
    for (const rule of this.rules) {
      for (const error of errors) {
        if (rule.errorCodes.includes(error.error_code) && rule.canFix(tokens, error)) {
          tokens = rule.apply(tokens, error);
        }
      }
    }

    // Step 3: Reconstruct source code from tokens
    return this.reconstructSource(tokens);
  }

  private reconstructSource(tokens: Token[]): string {
    let result = '';
    
    for (const token of tokens) {
      if (token.type === TokenType.EOF) {
        break;
      }
      
      // For most tokens, just append their value
      if (token.value !== undefined) {
        result += token.value;
      }
    }
    
    return result;
  }

  getAvailableRules(): string[] {
    return this.rules.map(rule => rule.name);
  }

  getRulesByErrorCode(errorCode: string): TokenFormatterRule[] {
    return this.rules.filter(rule => rule.errorCodes.includes(errorCode));
  }

  // Utility method to find token at specific line/column
  findTokenAtPosition(tokens: Token[], line: number, column: number): Token | null {
    for (const token of tokens) {
      if (token.lineno === line && 
          token.column <= column && 
          token.column + token.length > column) {
        return token;
      }
    }
    return null;
  }

  // Utility method to find tokens on a specific line
  getTokensOnLine(tokens: Token[], line: number): Token[] {
    return tokens.filter(token => token.lineno === line);
  }
}