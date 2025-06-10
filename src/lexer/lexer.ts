import { Token, Position, TokenType } from './token.js';
import { keywords, operators, brackets, sortedOperators } from './dictionary.js';

export class CLexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    
    while (this.position < this.input.length) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }
    
    // Add EOF token
    tokens.push(new Token(TokenType.EOF, { line: this.line, column: this.column }));
    
    return tokens;
  }

  private nextToken(): Token | null {
    this.skipWhitespace();
    
    if (this.position >= this.input.length) {
      return null;
    }

    const currentPos: Position = { line: this.line, column: this.column };
    
    // Handle comments
    if (this.peek() === '/' && this.peek(1) === '/') {
      return this.readLineComment(currentPos);
    }
    if (this.peek() === '/' && this.peek(1) === '*') {
      return this.readBlockComment(currentPos);
    }
    
    // Handle preprocessor directives
    if (this.peek() === '#') {
      return this.readPreprocessor(currentPos);
    }
    
    // Handle string literals
    if (this.peek() === '"') {
      return this.readString(currentPos);
    }
    
    // Handle character literals
    if (this.peek() === "'") {
      return this.readChar(currentPos);
    }
    
    // Handle numbers
    if (this.isDigit(this.peek())) {
      return this.readNumber(currentPos);
    }
    
    // Handle operators (check longest first)
    for (const op of sortedOperators) {
      if (this.match(op)) {
        this.advance(op.length);
        return new Token(operators[op], currentPos, op);
      }
    }
    
    // Handle brackets
    const bracket = this.peek();
    if (bracket && bracket in brackets) {
      this.advance();
      return new Token(brackets[bracket], currentPos, bracket);
    }
    
    // Handle identifiers and keywords
    if (this.isAlpha(this.peek()) || this.peek() === '_') {
      return this.readIdentifier(currentPos);
    }
    
    // Handle whitespace tokens (important for formatting)
    if (this.peek() === ' ') {
      return this.readSpaces(currentPos);
    }
    
    if (this.peek() === '\t') {
      this.advance();
      return new Token(TokenType.TAB, currentPos, '\t');
    }
    
    if (this.peek() === '\n') {
      const newlineToken = new Token(TokenType.NEWLINE, currentPos, '\n');
      this.advanceWithNewline();
      return newlineToken;
    }
    
    // Unknown character - skip it
    const unknownChar = this.peek();
    this.advance();
    return new Token('UNKNOWN', currentPos, unknownChar || '');
  }

  private readSpaces(pos: Position): Token {
    let spaces = '';
    while (this.peek() === ' ') {
      spaces += this.advance();
    }
    return new Token(TokenType.SPACE, pos, spaces);
  }

  private readLineComment(pos: Position): Token {
    let comment = '';
    while (this.peek() && this.peek() !== '\n') {
      comment += this.advance();
    }
    return new Token(TokenType.COMMENT, pos, comment);
  }

  private readBlockComment(pos: Position): Token {
    let comment = '';
    while (this.position < this.input.length - 1) {
      if (this.peek() === '*' && this.peek(1) === '/') {
        comment += this.advance(); // *
        comment += this.advance(); // /
        break;
      }
      comment += this.advanceWithNewline();
    }
    return new Token(TokenType.COMMENT, pos, comment);
  }

  private readPreprocessor(pos: Position): Token {
    let directive = '';
    while (this.peek() && this.peek() !== '\n') {
      directive += this.advance();
    }
    return new Token(TokenType.HASH, pos, directive);
  }

  private readString(pos: Position): Token {
    let str = '';
    str += this.advance(); // opening quote
    
    while (this.peek() && this.peek() !== '"') {
      if (this.peek() === '\\') {
        str += this.advance(); // backslash
        if (this.peek()) {
          str += this.advance(); // escaped character
        }
      } else {
        str += this.advanceWithNewline();
      }
    }
    
    if (this.peek() === '"') {
      str += this.advance(); // closing quote
    }
    
    return new Token(TokenType.STRING, pos, str);
  }

  private readChar(pos: Position): Token {
    let char = '';
    char += this.advance(); // opening quote
    
    while (this.peek() && this.peek() !== "'") {
      if (this.peek() === '\\') {
        char += this.advance(); // backslash
        if (this.peek()) {
          char += this.advance(); // escaped character
        }
      } else {
        char += this.advanceWithNewline();
      }
    }
    
    if (this.peek() === "'") {
      char += this.advance(); // closing quote
    }
    
    return new Token(TokenType.CONSTANT, pos, char);
  }

  private readNumber(pos: Position): Token {
    let num = '';
    
    // Handle hex numbers
    if (this.peek() === '0' && (this.peek(1) === 'x' || this.peek(1) === 'X')) {
      num += this.advance(); // 0
      num += this.advance(); // x
      while (this.isHexDigit(this.peek())) {
        num += this.advance();
      }
    } else {
      // Decimal number
      while (this.isDigit(this.peek())) {
        num += this.advance();
      }
      
      // Handle decimal point
      if (this.peek() === '.' && this.isDigit(this.peek(1))) {
        num += this.advance(); // .
        while (this.isDigit(this.peek())) {
          num += this.advance();
        }
      }
    }
    
    // Handle suffixes (l, L, f, F, etc.)
    while (this.isAlpha(this.peek())) {
      num += this.advance();
    }
    
    return new Token(TokenType.CONSTANT, pos, num);
  }

  private readIdentifier(pos: Position): Token {
    let id = '';
    
    while (this.isAlnum(this.peek()) || this.peek() === '_') {
      id += this.advance();
    }
    
    // Check if it's a keyword
    const tokenType = keywords[id] || TokenType.IDENTIFIER;
    return new Token(tokenType, pos, id);
  }

  private skipWhitespace(): void {
    // Only skip spaces, tabs, and newlines that we don't want to preserve
    // For formatting, we actually want to preserve most whitespace as tokens
  }

  private peek(offset: number = 0): string | null {
    const pos = this.position + offset;
    return pos < this.input.length ? this.input[pos] : null;
  }

  private advance(count: number = 1): string {
    let result = '';
    for (let i = 0; i < count && this.position < this.input.length; i++) {
      const char = this.input[this.position];
      result += char;
      this.position++;
      this.column++;
    }
    return result;
  }

  private advanceWithNewline(): string {
    const char = this.input[this.position];
    this.position++;
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  private match(str: string): boolean {
    for (let i = 0; i < str.length; i++) {
      if (this.peek(i) !== str[i]) {
        return false;
      }
    }
    return true;
  }

  private isDigit(char: string | null): boolean {
    return char !== null && char >= '0' && char <= '9';
  }

  private isHexDigit(char: string | null): boolean {
    return char !== null && (
      (char >= '0' && char <= '9') ||
      (char >= 'a' && char <= 'f') ||
      (char >= 'A' && char <= 'F')
    );
  }

  private isAlpha(char: string | null): boolean {
    return char !== null && (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z')
    );
  }

  private isAlnum(char: string | null): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }
}