import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import {
  RuleEngine,
  spaceBeforeFuncRule,
  spaceReplaceTabRule,
  spcAfterPointerRule,
  spcBfrPointerRule,
  missingTabFuncRule,
  missingTabVarRule,
  applyClangFormatWithFallback,
  runNorminette,
  fixNorminetteErrors
} from '../dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Norminette Rule Engine', () => {
  
  describe('Individual Rules', () => {
    
    describe('SPACE_BEFORE_FUNC Rule', () => {
      it('should fix space between return type and function name', () => {
        const content = 'int main(void)\n{\n\treturn (0);\n}';
        const error = {
          file: 'test.c',
          line: 1,
          column: 4,
          error_type: 'SPACE_BEFORE_FUNC',
          error_code: 'SPACE_BEFORE_FUNC',
          description: 'space before function name'
        };
        
        assert.equal(spaceBeforeFuncRule.canFix(error, content), true);
        const fixed = spaceBeforeFuncRule.apply(content, error);
        assert.equal(fixed, 'int\tmain(void)\n{\n\treturn (0);\n}');
      });

      it('should handle multiple spaces between type and function', () => {
        const content = 'int    main(void)\n{\n\treturn (0);\n}';
        const error = { line: 1, error_code: 'SPACE_BEFORE_FUNC' };
        
        const fixed = spaceBeforeFuncRule.apply(content, error);
        assert.equal(fixed, 'int\tmain(void)\n{\n\treturn (0);\n}');
      });
    });

    describe('SPACE_REPLACE_TAB Rule', () => {
      it('should fix spaces in variable declarations', () => {
        const content = '\tint i;\n\tint j;';
        const error = {
          file: 'test.c',
          line: 1,
          column: 8,
          error_type: 'SPACE_REPLACE_TAB',
          error_code: 'SPACE_REPLACE_TAB',
          description: 'Found space when expecting tab'
        };
        
        assert.equal(spaceReplaceTabRule.canFix(error, content), true);
        const fixed = spaceReplaceTabRule.apply(content, error);
        assert.equal(fixed, '\tint\ti;\n\tint j;');
      });

      it('should preserve initial tabs', () => {
        const content = '\t\tint variable;';
        const error = { line: 1, error_code: 'SPACE_REPLACE_TAB' };
        
        const fixed = spaceReplaceTabRule.apply(content, error);
        assert.equal(fixed, '\t\tint\tvariable;');
      });
    });

    describe('SPC_AFTER_POINTER Rule', () => {
      it('should remove space after pointer asterisk', () => {
        const content = 'char * str;';
        const error = { line: 1, error_code: 'SPC_AFTER_POINTER' };
        
        assert.equal(spcAfterPointerRule.canFix(error, content), true);
        const fixed = spcAfterPointerRule.apply(content, error);
        assert.equal(fixed, 'char *str;');
      });

      it('should handle multiple spaces after asterisk', () => {
        const content = 'int *   ptr;';
        const error = { line: 1, error_code: 'SPC_AFTER_POINTER' };
        
        const fixed = spcAfterPointerRule.apply(content, error);
        assert.equal(fixed, 'int *ptr;');
      });
    });

    describe('SPC_BFR_POINTER Rule', () => {
      it('should add space before pointer when missing', () => {
        const content = 'char*str;';
        const error = { line: 1, error_code: 'SPC_BFR_POINTER' };
        
        assert.equal(spcBfrPointerRule.canFix(error, content), true);
        const fixed = spcBfrPointerRule.apply(content, error);
        assert.equal(fixed, 'char *str;');
      });

      it('should fix multiple spaces before pointer', () => {
        const content = 'int    *ptr;';
        const error = { line: 1, error_code: 'SPC_BFR_POINTER' };
        
        const fixed = spcBfrPointerRule.apply(content, error);
        assert.equal(fixed, 'int *ptr;');
      });
    });

    describe('MISSING_TAB_FUNC Rule', () => {
      it('should add tab between type and function name', () => {
        const content = 'void function(void)\n{\n}';
        const error = { line: 1, error_code: 'MISSING_TAB_FUNC' };
        
        assert.equal(missingTabFuncRule.canFix(error, content), true);
        const fixed = missingTabFuncRule.apply(content, error);
        assert.equal(fixed, 'void\tfunction(void)\n{\n}');
      });
    });

    describe('MISSING_TAB_VAR Rule', () => {
      it('should add tab between type and variable name', () => {
        const content = '\tchar buffer[100];';
        const error = { line: 1, error_code: 'MISSING_TAB_VAR' };
        
        assert.equal(missingTabVarRule.canFix(error, content), true);
        const fixed = missingTabVarRule.apply(content, error);
        assert.equal(fixed, '\tchar\tbuffer[100];');
      });
    });
  });

  describe('Rule Engine Integration', () => {
    it('should apply multiple rules in priority order', () => {
      const engine = new RuleEngine();
      engine.addRule(spaceBeforeFuncRule);
      engine.addRule(spaceReplaceTabRule);
      
      const content = 'int main(void)\n{\n\tint i;\n\tint j;\n}';
      const errors = [
        { line: 1, error_code: 'SPACE_BEFORE_FUNC', error_type: 'SPACE_BEFORE_FUNC' },
        { line: 3, error_code: 'SPACE_REPLACE_TAB', error_type: 'SPACE_REPLACE_TAB' },
        { line: 4, error_code: 'SPACE_REPLACE_TAB', error_type: 'SPACE_REPLACE_TAB' }
      ];
      
      const fixed = engine.applyRules(content, errors);
      const expected = 'int\tmain(void)\n{\n\tint\ti;\n\tint\tj;\n}';
      assert.equal(fixed, expected);
    });

    it('should handle line number adjustments', () => {
      const engine = new RuleEngine();
      engine.addRule(spaceBeforeFuncRule);
      
      // Test that error line numbers don't need adjustment for simple replacements
      const content = 'int main(void)\n{\n\treturn (0);\n}';
      const errors = [
        { line: 1, error_code: 'SPACE_BEFORE_FUNC', error_type: 'SPACE_BEFORE_FUNC' }
      ];
      
      const fixed = engine.applyRules(content, errors);
      assert.equal(fixed.split('\n').length, content.split('\n').length);
    });
  });

  describe('Full Pipeline Integration', () => {
    it('should fix target.c file completely', async function() {
      this.timeout(10000); // Increase timeout for file operations
      
      const targetPath = path.join(__dirname, 'assets', 'target.c');
      const originalContent = fs.readFileSync(targetPath, 'utf8');
      
      // Create a temporary copy for testing
      const tempPath = path.join(__dirname, 'assets', 'target_temp.c');
      fs.writeFileSync(tempPath, originalContent);
      
      try {
        // Run the fix
        const result = await fixNorminetteErrors(tempPath);
        
        // Check results
        assert.equal(result.original_errors > 0, true, 'Should have original errors');
        assert.equal(result.fixes_applied.length > 0, true, 'Should apply fixes');
        assert.equal(result.final_error_count, 0, 'Should have no remaining errors');
        
        // Verify the file was actually fixed
        const fixedContent = fs.readFileSync(tempPath, 'utf8');
        assert.notEqual(fixedContent, originalContent, 'Content should be modified');
        
        // Verify specific fixes
        assert.equal(fixedContent.includes('int\tmain('), true, 'Should have tab between int and main');
        assert.equal(fixedContent.includes('\tint\ti;'), true, 'Should have tab in variable declaration');
        assert.equal(fixedContent.includes('\tint\tj;'), true, 'Should have tab in variable declaration');
        
      } finally {
        // Clean up
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });

    it('should correctly categorize and route errors', async function() {
      const targetPath = path.join(__dirname, 'assets', 'target.c');
      const content = fs.readFileSync(targetPath, 'utf8');
      
      // First apply clang-format
      const formatResult = await applyClangFormatWithFallback(content);
      assert.equal(formatResult.usedClangFormat || formatResult.formatted !== content, true);
      
      // Check if rule engine would be needed
      const tempPath = path.join(__dirname, 'assets', 'target_test.c');
      fs.writeFileSync(tempPath, formatResult.formatted);
      
      try {
        const postFormatErrors = await runNorminette(tempPath);
        
        if (postFormatErrors.errors.length > 0) {
          // Verify these are norminette-specific errors
          const errorCodes = postFormatErrors.errors.map(e => e.error_code);
          assert.equal(errorCodes.includes('SPACE_BEFORE_FUNC') || 
                      errorCodes.includes('SPACE_REPLACE_TAB'), true,
                      'Should have norminette-specific errors after clang-format');
        }
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });
  });

  describe('Error Edge Cases', () => {
    it('should handle empty content gracefully', () => {
      const engine = new RuleEngine();
      engine.addRule(spaceBeforeFuncRule);
      
      const fixed = engine.applyRules('', []);
      assert.equal(fixed, '');
    });

    it('should skip unfixable errors', () => {
      const engine = new RuleEngine();
      engine.addRule(spaceBeforeFuncRule);
      
      const content = 'int main(void)\n{\n}';
      const errors = [
        { line: 1, error_code: 'UNKNOWN_ERROR', error_type: 'UNKNOWN_ERROR' }
      ];
      
      const fixed = engine.applyRules(content, errors);
      assert.equal(fixed, content, 'Should not modify content for unknown errors');
    });

    it('should handle out-of-bounds line numbers', () => {
      const engine = new RuleEngine();
      engine.addRule(spaceBeforeFuncRule);
      
      const content = 'int main(void)';
      const errors = [
        { line: 10, error_code: 'SPACE_BEFORE_FUNC', error_type: 'SPACE_BEFORE_FUNC' }
      ];
      
      const fixed = engine.applyRules(content, errors);
      assert.equal(fixed, content, 'Should not crash on invalid line numbers');
    });
  });
});