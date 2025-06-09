import { strict as assert } from 'assert';
import { 
  fixTrailingSpaces, 
  fixSpaceOnEmptyLines, 
  fixLeadingSpaces, 
  fixTabsToSpaces, 
  fixConsecutiveSpaces, 
  fixConsecutiveWhitespace, 
  fixMixedSpacesAndTabs 
} from '../dist/index.js';

describe('Norminette Fix Functions', () => {
  
  describe('fixTrailingSpaces', () => {
    it('should remove trailing spaces', () => {
      const input = 'hello world   \nline 2\t\t\nline 3';
      const expected = 'hello world\nline 2\nline 3';
      assert.equal(fixTrailingSpaces(input), expected);
    });

    it('should remove trailing tabs', () => {
      const input = 'hello\t\t\nworld\t \nend';
      const expected = 'hello\nworld\nend';
      assert.equal(fixTrailingSpaces(input), expected);
    });

    it('should handle empty lines', () => {
      const input = 'line1\n\t\t\n\nline2';
      const expected = 'line1\n\n\nline2';
      assert.equal(fixTrailingSpaces(input), expected);
    });
  });

  describe('fixSpaceOnEmptyLines', () => {
    it('should remove spaces on empty lines', () => {
      const input = 'line1\n   \nline2\n\t\t\nline3';
      const expected = 'line1\n\nline2\n\nline3';
      assert.equal(fixSpaceOnEmptyLines(input), expected);
    });

    it('should not affect non-empty lines', () => {
      const input = 'line1   \n   content   \nline3';
      const expected = 'line1   \n   content   \nline3';
      assert.equal(fixSpaceOnEmptyLines(input), expected);
    });
  });

  describe('fixLeadingSpaces', () => {
    it('should convert 4 spaces to 1 tab', () => {
      const input = '    hello\n        world\n   partial';
      const expected = '\thello\n\t\tworld\n   partial';
      assert.equal(fixLeadingSpaces(input), expected);
    });

    it('should handle mixed leading spaces', () => {
      const input = '        code\n    line2\n      line3';
      const expected = '\t\tcode\n\tline2\n\t  line3';
      assert.equal(fixLeadingSpaces(input), expected);
    });

    it('should not affect lines without leading spaces', () => {
      const input = 'no spaces\n\talready tab\nmixed content';
      const expected = 'no spaces\n\talready tab\nmixed content';
      assert.equal(fixLeadingSpaces(input), expected);
    });
  });

  describe('fixTabsToSpaces', () => {
    it('should convert tabs to spaces in non-leading positions', () => {
      const input = '\tif (x\t==\ty)\n\t\treturn\t1;';
      const expected = '\tif (x == y)\n\t\treturn 1;';
      assert.equal(fixTabsToSpaces(input), expected);
    });

    it('should preserve leading tabs', () => {
      const input = '\t\tfunction()\t{\n\t\t\treturn\t0;\n\t\t}';
      const expected = '\t\tfunction() {\n\t\t\treturn 0;\n\t\t}';
      assert.equal(fixTabsToSpaces(input), expected);
    });

    it('should handle empty lines', () => {
      const input = '\tcode\n\n\tmore code';
      const expected = '\tcode\n\n\tmore code';
      assert.equal(fixTabsToSpaces(input), expected);
    });
  });

  describe('fixConsecutiveSpaces', () => {
    it('should fix consecutive spaces in code', () => {
      const input = '\tint  x    =   5;\n\tif  (x   >  0)';
      const expected = '\tint x = 5;\n\tif (x > 0)';
      assert.equal(fixConsecutiveSpaces(input), expected);
    });

    it('should preserve leading whitespace', () => {
      const input = '    int  x  =  5;\n\t\tif   (condition)';
      const expected = '    int x = 5;\n\t\tif (condition)';
      assert.equal(fixConsecutiveSpaces(input), expected);
    });

    it('should handle empty lines', () => {
      const input = 'code\n\nmore  code';
      const expected = 'code\n\nmore code';
      assert.equal(fixConsecutiveSpaces(input), expected);
    });
  });

  describe('fixConsecutiveWhitespace', () => {
    it('should fix consecutive mixed whitespace', () => {
      const input = '\tint x \t  = \t 5;';
      const expected = '\tint x = 5;';
      assert.equal(fixConsecutiveWhitespace(input), expected);
    });

    it('should handle all spaces', () => {
      const input = '\tcode    here';
      const expected = '\tcode here';
      assert.equal(fixConsecutiveWhitespace(input), expected);
    });

    it('should handle all tabs', () => {
      const input = '\tcode\t\t\there';
      const expected = '\tcode\there';
      assert.equal(fixConsecutiveWhitespace(input), expected);
    });
  });

  describe('fixMixedSpacesAndTabs', () => {
    it('should fix mixed spaces and tabs in leading whitespace', () => {
      const input = ' \t  \tcode here';
      // This input: 1 space + 1 tab + 2 spaces + 1 tab = 1 + 4 + 2 + 4 = 11 total spaces
      // 11 / 4 = 2 tabs remainder 3 spaces  
      const expected = '\t\t   code here';
      assert.equal(fixMixedSpacesAndTabs(input), expected);
    });

    it('should convert tabs to spaces in non-leading positions', () => {
      const input = '\tif (x\t==\ty)';
      const expected = '\tif (x == y)';
      assert.equal(fixMixedSpacesAndTabs(input), expected);
    });

    it('should handle complex mixed indentation', () => {
      const input = '  \t  function() {\n \t\t  return\t0;\n  \t}';
      // Line 1: 2 space + 1 tab + 2 space = 2 + 4 + 2 = 8 total = 2 tabs
      // Line 2: 1 space + 1 tab + 1 tab + 2 space = 1 + 4 + 4 + 2 = 11 total = 2 tabs + 3 spaces  
      // Line 3: 2 space + 1 tab = 2 + 4 = 6 total = 1 tab + 2 spaces
      // Note: Tab in "return\t0;" gets converted to space by the function
      const expected = '\t\tfunction() {\n\t\t   return 0;\n\t  }';
      assert.equal(fixMixedSpacesAndTabs(input), expected);
    });

    it('should not affect lines without mixed whitespace', () => {
      const input = '\t\tpure tabs\n    pure spaces\nno leading';
      const expected = '\t\tpure tabs\n    pure spaces\nno leading';
      assert.equal(fixMixedSpacesAndTabs(input), expected);
    });
  });

  describe('Integration tests', () => {
    it('should handle complex real-world code', () => {
      const input = `int  function( int   x )  \n{\n    int  y   =   x + 1;     \n\t\tif (y > 0)  \n    {\n\t printf("Hello\tworld");  \n\t \t\treturn (y);\n\t}\n\treturn (0);\n}`;
      
      // Apply all fixes in sequence
      let result = fixTrailingSpaces(input);
      result = fixSpaceOnEmptyLines(result);
      result = fixLeadingSpaces(result);
      result = fixTabsToSpaces(result);
      result = fixConsecutiveSpaces(result);
      result = fixConsecutiveWhitespace(result);
      result = fixMixedSpacesAndTabs(result);
      
      // Verify basic improvements (allow some edge cases)
      assert(!result.includes('   '), 'Should not have 3+ consecutive spaces');
      assert(!result.includes(' \n'), 'Should not have trailing spaces');
      
      // Check that the basic structure is improved
      const lines = result.split('\n');
      assert(lines.length > 5, 'Should maintain line structure');
      
      // Basic whitespace normalization should have occurred  
      assert(result.length < input.length, 'Should reduce overall size by removing excess whitespace');
    });
  });
});