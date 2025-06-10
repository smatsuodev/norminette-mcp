export interface Position {
  line: number;
  column: number;
}

export class Token {
  constructor(
    public type: string,
    public pos: Position,
    public value?: string
  ) {}

  get length(): number {
    return this.value?.length || 0;
  }

  get lineno(): number {
    return this.pos.line;
  }

  get column(): number {
    return this.pos.column;
  }

  toString(): string {
    return this.value ? `<${this.type}=${this.value}>` : `<${this.type}>`;
  }
}

// Token types based on norminette lexer
export const TokenType = {
  // Keywords
  INT: 'INT',
  CHAR: 'CHAR',
  VOID: 'VOID',
  CONST: 'CONST',
  STATIC: 'STATIC',
  STRUCT: 'STRUCT',
  ENUM: 'ENUM',
  TYPEDEF: 'TYPEDEF',
  IF: 'IF',
  ELSE: 'ELSE',
  WHILE: 'WHILE',
  FOR: 'FOR',
  RETURN: 'RETURN',
  
  // Operators
  ASSIGN: 'ASSIGN',
  PLUS: 'PLUS',
  MINUS: 'MINUS',
  MULT: 'MULT',
  DIV: 'DIV',
  MODULO: 'MODULO',
  
  // Brackets
  LBRACE: 'LBRACE',
  RBRACE: 'RBRACE',
  LPARENTHESIS: 'LPARENTHESIS',
  RPARENTHESIS: 'RPARENTHESIS',
  LBRACKET: 'LBRACKET',
  RBRACKET: 'RBRACKET',
  
  // Punctuation
  SEMI_COLON: 'SEMI_COLON',
  COMMA: 'COMMA',
  DOT: 'DOT',
  
  // Literals
  IDENTIFIER: 'IDENTIFIER',
  CONSTANT: 'CONSTANT',
  STRING: 'STRING',
  
  // Whitespace
  SPACE: 'SPACE',
  TAB: 'TAB',
  NEWLINE: 'NEWLINE',
  
  // Preprocessor
  HASH: 'HASH',
  INCLUDE: 'INCLUDE',
  DEFINE: 'DEFINE',
  
  // Comments
  COMMENT: 'COMMENT',
  
  // Special
  EOF: 'EOF'
} as const;