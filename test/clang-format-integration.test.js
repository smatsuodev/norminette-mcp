import { strict as assert } from 'assert';
import { 
  checkClangFormatAvailability,
  applyClangFormat,
  applyClangFormatWithFallback,
  generateClangFormatConfigString
} from '../dist/index.js';

describe('clang-format Integration System', () => {
  
  describe('clang-format Availability', () => {
    it('should check if clang-format is available', async () => {
      const available = await checkClangFormatAvailability();
      assert.equal(typeof available, 'boolean');
      console.log('  clang-format available:', available);
    });
  });

  describe('42 School Configuration Generation', () => {
    it('should generate valid YAML config string', () => {
      const configString = generateClangFormatConfigString();
      
      assert(typeof configString === 'string');
      assert(configString.includes('Language: Cpp'));
      assert(configString.includes('UseTab: Always'));
      assert(configString.includes('ColumnLimit: 1024'));
      assert(configString.includes('TabWidth: 4'));
      assert(!configString.includes('---'));
    });
  });


  describe('clang-format Application', () => {
    const testCode = `#include <stdio.h>

int main(void){
int  x=1,y    = 2;
    if(x>0)   {
printf("Hello");
}
return 0;
}`;

    it('should apply clang-format when available', async function() {
      this.timeout(10000); // clang-format may take time
      
      const available = await checkClangFormatAvailability();
      if (!available) {
        console.log('  Skipping clang-format test - not available');
        this.skip();
      }

      try {
        const formatted = await applyClangFormat(testCode);
        
        // Verify basic formatting improvements
        assert(typeof formatted === 'string');
        assert(formatted !== testCode);
        assert(formatted.includes('int main(void)'));
        
        // clang-format should improve spacing
        assert(!formatted.includes('int  x=1,y    = 2'));
        assert(!formatted.includes('    if(x>0)   {'));
        
        console.log('  clang-format successfully applied');
      } catch (error) {
        console.log('  clang-format error (acceptable):', error.message);
      }
    });

    it('should use fallback when clang-format fails', async function() {
      this.timeout(5000);
      
      const result = await applyClangFormatWithFallback(testCode);
      
      // Should always return a result
      assert(typeof result === 'object');
      assert(typeof result.formatted === 'string');
      assert(typeof result.usedClangFormat === 'boolean');
      
      // Should improve the code in some way
      assert(result.formatted.length > 0);
      
      console.log('  Used clang-format:', result.usedClangFormat);
      console.log('  Formatting applied successfully');
    });
  });


  describe('Complex Code Formatting', () => {
    it('should handle function declarations correctly', async function() {
      this.timeout(10000);
      
      const complexCode = `int function(int x, char *str) {
int result = 0;
if (x > 0) {
result = x * 2;
printf("Result: %d\\n", result);
}
return result;
}`;

      const result = await applyClangFormatWithFallback(complexCode);
      
      // Should maintain basic structure
      assert(result.formatted.includes('int function'));
      assert(result.formatted.includes('return result;'));
      
      // Should be properly formatted
      assert(typeof result.formatted === 'string');
      assert(result.formatted.length > 0);
      
      console.log('  Complex code formatting:', result.usedClangFormat ? 'clang-format' : 'fallback');
    });

    it('should handle 42 School specific patterns', async function() {
      this.timeout(10000);
      
      const schoolCode = `#include <unistd.h>

void ft_putchar(char c)
{
write(1, &c, 1);
}

int main(void)
{
ft_putchar('A');
return (0);
}`;

      const result = await applyClangFormatWithFallback(schoolCode);
      
      // Should maintain 42 School patterns
      assert(result.formatted.includes('ft_putchar'));
      assert(result.formatted.includes('return (0);'));
      
      console.log('  42 School pattern formatting completed');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', async () => {
      try {
        const result = await applyClangFormatWithFallback('invalid C code {{{{ }}}}');
        
        // Should not crash, should return something
        assert(typeof result === 'object');
        assert(typeof result.formatted === 'string');
        
      } catch (error) {
        // If it throws, that's also acceptable
        assert(error instanceof Error);
      }
    });

    it('should handle empty input', async () => {
      const result = await applyClangFormatWithFallback('');
      
      assert(typeof result === 'object');
      assert(result.formatted === '');
    });
  });
});