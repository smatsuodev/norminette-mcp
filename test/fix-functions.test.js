import { strict as assert } from 'assert';
import { 
  fixTrailingSpaces, 
  fixSpaceOnEmptyLines, 
  fixLeadingSpaces, 
  fixTabsToSpaces, 
  fixConsecutiveSpaces, 
  fixConsecutiveWhitespace, 
  fixMixedSpacesAndTabs,
  fixAllWhitespaceIssues,
  parseCodeSegments,
  fixCodeSegment
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

  describe('Comment and string preservation tests', () => {
    it('should preserve whitespace in line comments', () => {
      const input = '\tcode;  // This\thas  multiple   spaces and\ttabs';
      const expected = '\tcode; // This\thas  multiple   spaces and\ttabs';
      
      // Apply fixes that would normally change whitespace
      let result = fixTabsToSpaces(input);
      result = fixConsecutiveSpaces(result);
      result = fixConsecutiveWhitespace(result);
      
      assert.equal(result, expected);
    });

    it('should preserve whitespace in block comments', () => {
      const input = '\tcode; /* This\thas  multiple   spaces and\ttabs */';
      const expected = '\tcode; /* This\thas  multiple   spaces and\ttabs */';
      
      // Apply fixes that would normally change whitespace
      let result = fixTabsToSpaces(input);
      result = fixConsecutiveSpaces(result);
      result = fixConsecutiveWhitespace(result);
      
      assert.equal(result, expected);
    });

    it('should preserve whitespace in string literals', () => {
      const input = '\tprintf("Hello\tworld  with   spaces");';
      const expected = '\tprintf("Hello\tworld  with   spaces");';
      
      // Apply fixes that would normally change whitespace
      let result = fixTabsToSpaces(input);
      result = fixConsecutiveSpaces(result);
      result = fixConsecutiveWhitespace(result);
      
      assert.equal(result, expected);
    });

    it('should fix whitespace outside comments but preserve inside', () => {
      const input = '\tint  x\t=\t5;  // Comment\twith  tabs   and spaces';
      const expected = '\tint x = 5; // Comment\twith  tabs   and spaces';
      
      // Apply fixes that would normally change whitespace
      let result = fixTabsToSpaces(input);
      result = fixConsecutiveSpaces(result);
      result = fixConsecutiveWhitespace(result);
      
      assert.equal(result, expected);
    });

    it('should handle mixed comments and code correctly', () => {
      const input = '\tif\t(x\t==\ty) /* mixed\ttabs */ printf("test\tstring");';
      const expected = '\tif (x == y) /* mixed\ttabs */ printf("test\tstring");';
      
      // Apply fixes that would normally change whitespace
      let result = fixTabsToSpaces(input);
      result = fixConsecutiveSpaces(result);
      result = fixConsecutiveWhitespace(result);
      
      assert.equal(result, expected);
    });
  });

  describe('New comprehensive fix function', () => {
    it('should handle multi-line comments correctly', () => {
      const input = `/* This is a\n   multi-line comment\n   with  tabs\tand  spaces */\nint x = 5;`;
      const result = fixAllWhitespaceIssues(input);
      
      // Comment should be preserved exactly
      assert(result.includes('/* This is a\n   multi-line comment\n   with  tabs\tand  spaces */'));
      // Code should be fixed
      assert(result.includes('int x = 5;'));
    });

    it('should parse code segments correctly', () => {
      const input = `code /* comment */ more code // line comment\nmore code`;
      const segments = parseCodeSegments(input);
      
      assert.equal(segments.length, 5);
      assert.equal(segments[0].type, 'code');
      assert.equal(segments[0].content, 'code ');
      assert.equal(segments[1].type, 'comment');
      assert.equal(segments[1].content, '/* comment */');
      assert.equal(segments[2].type, 'code');
      assert.equal(segments[2].content, ' more code ');
      assert.equal(segments[3].type, 'comment');
      assert.equal(segments[3].content, '// line comment\n');
      assert.equal(segments[4].type, 'code');
      assert.equal(segments[4].content, 'more code');
    });

    it('should fix code segments according to requirements', () => {
      const input = '    int  x\t=  5;  \n  \n        y = 6; ';
      const result = fixCodeSegment(input);
      
      // Should convert leading spaces to tabs, fix consecutive spaces, remove trailing spaces
      const expected = '\tint x = 5;\n\n\t\ty = 6;';
      assert.equal(result, expected);
    });

    it('should handle complete 42 header correctly', () => {
      const input = `/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   test.c                                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: user <user@student.42.fr>                   +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2024/01/01 12:00:00 by user              #+#    #+#             */
/*   Updated: 2024/01/01 12:00:00 by user             ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include <stdio.h>

int    main(void)  
{
    int  x   =   5;   
    return (0);  
}`;

      const result = fixAllWhitespaceIssues(input);
      
      // Header should be completely preserved
      assert(result.includes('/*                                                        :::      ::::::::   */'));
      assert(result.includes('/*   test.c                                              :+:      :+:    :+:   */'));
      
      // Code should be fixed
      assert(result.includes('#include <stdio.h>'));
      assert(result.includes('\tint x = 5;'));
      assert(!result.includes('int    main(void)  '));
      assert(!result.includes('    int  x   =   5;   '));
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
      
      // Verify string literals are preserved
      assert(result.includes('"Hello\tworld"'), 'Should preserve tabs in string literals');
    });

    it('should use new comprehensive function for better results', () => {
      const input = `int  function( int   x )  \n{\n    int  y   =   x + 1;     \n\t\tif (y > 0)  \n    {\n\t printf("Hello\tworld");  \n\t \t\treturn (y);\n\t}\n\treturn (0);\n}`;
      
      const result = fixAllWhitespaceIssues(input);
      
      // Should preserve string literals
      assert(result.includes('"Hello\tworld"'), 'Should preserve tabs in string literals');
      // Should fix whitespace issues
      assert(!result.includes('   '), 'Should not have 3+ consecutive spaces');
      assert(!result.includes(' \n'), 'Should not have trailing spaces');
    });
  });
});