import { strict as assert } from 'assert';
import { CLexer, TokenType } from '../dist/index.js';

describe('C Lexer Tests', () => {
  
  describe('Basic Tokenization', () => {
    it('should tokenize variable declaration', () => {
      const input = 'int x;';
      const lexer = new CLexer(input);
      const tokens = lexer.tokenize();
      
      // Remove EOF token for easier testing
      const nonEofTokens = tokens.filter(t => t.type !== TokenType.EOF);
      
      assert.equal(nonEofTokens.length, 4); // int, space, x, ;
      assert.equal(nonEofTokens[0].type, 'INT');
      assert.equal(nonEofTokens[0].value, 'int');
      assert.equal(nonEofTokens[1].type, TokenType.SPACE);
      assert.equal(nonEofTokens[2].type, TokenType.IDENTIFIER);
      assert.equal(nonEofTokens[2].value, 'x');
      assert.equal(nonEofTokens[3].type, 'SEMI_COLON');
      
      console.log('  Tokens:', nonEofTokens.map(t => `${t.type}=${t.value}`));
    });
    
    it('should tokenize function declaration', () => {
      const input = 'int main(void)';
      const lexer = new CLexer(input);
      const tokens = lexer.tokenize();
      
      const nonEofTokens = tokens.filter(t => t.type !== TokenType.EOF);
      
      assert.equal(nonEofTokens.length, 6); // int, space, main, (, void, )
      assert.equal(nonEofTokens[0].type, 'INT');
      assert.equal(nonEofTokens[1].type, TokenType.SPACE);
      assert.equal(nonEofTokens[2].type, TokenType.IDENTIFIER);
      assert.equal(nonEofTokens[2].value, 'main');
      assert.equal(nonEofTokens[3].type, TokenType.LPARENTHESIS);
      assert.equal(nonEofTokens[4].type, 'VOID');
      assert.equal(nonEofTokens[5].type, TokenType.RPARENTHESIS);
      
      console.log('  Function tokens:', nonEofTokens.map(t => `${t.type}=${t.value}`));
    });

    it('should handle multi-line code', () => {
      const input = 'int main(void)\n{\n\tint x;\n}';
      const lexer = new CLexer(input);
      const tokens = lexer.tokenize();
      
      const nonEofTokens = tokens.filter(t => t.type !== TokenType.EOF);
      
      // Should have tokens for each line
      const newlineTokens = tokens.filter(t => t.type === TokenType.NEWLINE);
      assert.equal(newlineTokens.length, 3); // 3 newlines
      
      console.log('  Multi-line tokens count:', nonEofTokens.length);
      
      // Verify line numbers are correct
      const intTokens = tokens.filter(t => t.type === 'INT');
      assert.equal(intTokens.length, 2); // Two 'int' tokens
      assert.equal(intTokens[0].lineno, 1); // First 'int' on line 1
      assert.equal(intTokens[1].lineno, 3); // Second 'int' on line 3
    });
  });
  
  describe('Whitespace Handling', () => {
    it('should preserve spaces and tabs as tokens', () => {
      const input = 'int\tx;'; // int, tab, x, ;
      const lexer = new CLexer(input);
      const tokens = lexer.tokenize();
      
      const nonEofTokens = tokens.filter(t => t.type !== TokenType.EOF);
      
      assert.equal(nonEofTokens.length, 4);
      assert.equal(nonEofTokens[0].type, 'INT');
      assert.equal(nonEofTokens[1].type, TokenType.TAB);
      assert.equal(nonEofTokens[1].value, '\t');
      assert.equal(nonEofTokens[2].type, TokenType.IDENTIFIER);
      assert.equal(nonEofTokens[3].type, 'SEMI_COLON');
      
      console.log('  Whitespace tokens:', nonEofTokens.map(t => `${t.type}=${JSON.stringify(t.value)}`));
    });
  });
});