import { strict as assert } from 'assert';
import { 
  NorminetteFormatter,
  defaultFormattingRules,
  CLexer,
  TokenType
} from '../dist/index.js';

describe('Norminette Formatter System', () => {
  
  describe('Lexer Functionality', () => {
    it('should tokenize simple C code correctly', () => {
      const input = 'int x;';
      const lexer = new CLexer(input);
      const tokens = lexer.tokenize();
      
      assert(tokens.length >= 4); // int, space, x, ;, EOF
      assert.equal(tokens[0].type, 'INT');
      assert.equal(tokens[0].value, 'int');
      assert.equal(tokens[1].type, TokenType.SPACE);
      assert.equal(tokens[2].type, TokenType.IDENTIFIER);
      assert.equal(tokens[2].value, 'x');
      console.log('  Lexer tokenization working correctly');
    });
  });

  describe('Formatter Initialization', () => {
    it('should create formatter with default rules', () => {
      const formatter = new NorminetteFormatter();
      
      for (const rule of defaultFormattingRules) {
        formatter.addRule(rule);
      }
      
      const availableRules = formatter.getAvailableRules();
      assert(availableRules.length >= 2);
      assert(availableRules.includes('SPACE_REPLACE_TAB'));
      assert(availableRules.includes('SPACE_BEFORE_FUNC'));
      console.log('  Available formatting rules:', availableRules);
    });
  });

  describe('SPACE_REPLACE_TAB Rule', () => {
    it('should fix variable declaration spacing', () => {
      const formatter = new NorminetteFormatter();
      for (const rule of defaultFormattingRules) {
        formatter.addRule(rule);
      }
      
      const input = 'int x;';
      const error = {
        file: 'test.c',
        line: 1,
        column: 4,
        error_type: 'SPACE_REPLACE_TAB',
        error_code: 'SPACE_REPLACE_TAB',
        description: 'Found space when expecting tab'
      };
      
      const result = formatter.format(input, [error]);
      assert.equal(result, 'int\tx;');
      console.log('  Variable declaration fix: "int x;" -> "int\\tx;"');
    });
    
    it('should handle indented variable declarations', () => {
      const formatter = new NorminetteFormatter();
      for (const rule of defaultFormattingRules) {
        formatter.addRule(rule);
      }
      
      const input = '\tint x;';
      const error = {
        file: 'test.c',
        line: 1,
        column: 8,
        error_type: 'SPACE_REPLACE_TAB',
        error_code: 'SPACE_REPLACE_TAB',
        description: 'Found space when expecting tab'
      };
      
      const result = formatter.format(input, [error]);
      assert.equal(result, '\tint\tx;');
      console.log('  Indented variable fix: "\\tint x;" -> "\\tint\\tx;"');
    });
  });

  describe('SPACE_BEFORE_FUNC Rule', () => {
    it('should fix function declaration spacing', () => {
      const formatter = new NorminetteFormatter();
      for (const rule of defaultFormattingRules) {
        formatter.addRule(rule);
      }
      
      const input = 'int main(void)';
      const error = {
        file: 'test.c',
        line: 1,
        column: 4,
        error_type: 'SPACE_BEFORE_FUNC',
        error_code: 'SPACE_BEFORE_FUNC',
        description: 'Space before function name'
      };
      
      const result = formatter.format(input, [error]);
      assert.equal(result, 'int\tmain(void)');
      console.log('  Function declaration fix: "int main(void)" -> "int\\tmain(void)"');
    });
  });

  describe('Multiple Errors', () => {
    it('should handle multiple formatting errors in one pass', () => {
      const formatter = new NorminetteFormatter();
      for (const rule of defaultFormattingRules) {
        formatter.addRule(rule);
      }
      
      const input = 'int main(void)\n{\n\tint x;\n}';
      const errors = [
        {
          file: 'test.c',
          line: 1,
          column: 4,
          error_type: 'SPACE_BEFORE_FUNC',
          error_code: 'SPACE_BEFORE_FUNC',
          description: 'Space before function name'
        },
        {
          file: 'test.c',
          line: 3,
          column: 8,
          error_type: 'SPACE_REPLACE_TAB',
          error_code: 'SPACE_REPLACE_TAB',
          description: 'Found space when expecting tab'
        }
      ];
      
      const result = formatter.format(input, errors);
      const expectedLines = ['int\tmain(void)', '{', '\tint\tx;', '}'];
      assert.equal(result, expectedLines.join('\n'));
      console.log('  Multiple errors fixed successfully');
    });
  });

  describe('Rule Management', () => {
    it('should get rules by error code', () => {
      const formatter = new NorminetteFormatter();
      for (const rule of defaultFormattingRules) {
        formatter.addRule(rule);
      }
      
      const spaceRules = formatter.getRulesByErrorCode('SPACE_REPLACE_TAB');
      assert.equal(spaceRules.length, 1);
      assert.equal(spaceRules[0].name, 'SPACE_REPLACE_TAB');
      
      const funcRules = formatter.getRulesByErrorCode('SPACE_BEFORE_FUNC');
      assert.equal(funcRules.length, 1);
      assert.equal(funcRules[0].name, 'SPACE_BEFORE_FUNC');
      
      console.log('  Rule lookup by error code working correctly');
    });
  });
});