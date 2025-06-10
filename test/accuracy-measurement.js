#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SAMPLES_DIR = path.join(PROJECT_ROOT, 'norminette/tests/rules/samples');
const TMP_DIR = path.join(PROJECT_ROOT, 'tmp');
const ASSETS_DIR = path.join(TMP_DIR, 'assets');

async function main() {
    console.log('Starting norminette accuracy measurement...');
    
    try {
        // Step 1: Setup directories
        console.log('Step 1: Setting up directories...');
        setupDirectories();
        
        // Step 2: Copy C/H files
        console.log('Step 2: Copying C/H files...');
        copySourceFiles();
        
        // Step 3: Run initial norminette check
        console.log('Step 3: Running initial norminette check...');
        await runNorminetteCheck('before');
        
        // Step 4: Apply norminette fix
        console.log('Step 4: Applying norminette fix...');
        await runNorminetteFix();
        
        // Step 5: Run post-fix norminette check
        console.log('Step 5: Running post-fix norminette check...');
        await runNorminetteCheck('after');
        
        // Step 6: Generate comparison summary
        console.log('Step 6: Generating comparison summary...');
        generateSummary();
        
        console.log('Accuracy measurement completed successfully!');
        console.log(`Results saved in ${TMP_DIR}`);
        
    } catch (error) {
        console.error('Error during accuracy measurement:', error.message);
        process.exit(1);
    }
}

function setupDirectories() {
    // Create tmp directory if it doesn't exist
    if (!fs.existsSync(TMP_DIR)) {
        fs.mkdirSync(TMP_DIR, { recursive: true });
    }
    
    // Remove and recreate only the assets directory
    if (fs.existsSync(ASSETS_DIR)) {
        fs.rmSync(ASSETS_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    
    // Remove only YAML files (preserving archive directories)
    if (fs.existsSync(TMP_DIR)) {
        const files = fs.readdirSync(TMP_DIR);
        files.forEach(file => {
            const filePath = path.join(TMP_DIR, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile() && file.endsWith('.yml')) {
                fs.unlinkSync(filePath);
            }
        });
    }
}

function copySourceFiles() {
    const files = fs.readdirSync(SAMPLES_DIR);
    const sourceFiles = files.filter(file => file.endsWith('.c') || file.endsWith('.h'));
    
    console.log(`Found ${sourceFiles.length} source files to copy`);
    
    sourceFiles.forEach(file => {
        const sourcePath = path.join(SAMPLES_DIR, file);
        const destPath = path.join(ASSETS_DIR, file);
        fs.copyFileSync(sourcePath, destPath);
    });
    
    console.log(`Copied ${sourceFiles.length} files to ${ASSETS_DIR}`);
}

async function runNorminetteCheck(phase) {
    const outputFile = path.join(TMP_DIR, `${phase}.yml`);
    
    try {
        // Use the MCP server to run norminette_check
        const command = `node ${PROJECT_ROOT}/dist/index.js`;
        const input = JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
                name: "norminette_check",
                arguments: {
                    path: ASSETS_DIR
                }
            }
        });
        
        const result = execSync(command, {
            input: input + '\n',
            encoding: 'utf-8',
            cwd: PROJECT_ROOT
        });
        
        // Parse the MCP response and extract the YAML result
        const lines = result.trim().split('\n');
        const response = JSON.parse(lines[lines.length - 1]);
        
        if (response.result && response.result.content) {
            const yamlContent = response.result.content[0].text;
            fs.writeFileSync(outputFile, yamlContent);
            console.log(`Norminette check results saved to ${outputFile}`);
        } else {
            throw new Error('Invalid MCP response format');
        }
        
    } catch (error) {
        console.error(`Error running norminette_check for ${phase}:`, error.message);
        // Create empty YAML file as fallback
        fs.writeFileSync(outputFile, 'files: []\n');
    }
}

async function runNorminetteFix() {
    try {
        // Use the MCP server to run norminette_fix
        const command = `node ${PROJECT_ROOT}/dist/index.js`;
        const input = JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
                name: "norminette_fix",
                arguments: {
                    path: ASSETS_DIR
                }
            }
        });
        
        const result = execSync(command, {
            input: input + '\n',
            encoding: 'utf-8',
            cwd: PROJECT_ROOT
        });
        
        console.log('Norminette fix completed');
        
    } catch (error) {
        console.error('Error running norminette_fix:', error.message);
        throw error;
    }
}

function generateSummary() {
    const beforeFile = path.join(TMP_DIR, 'before.yml');
    const afterFile = path.join(TMP_DIR, 'after.yml');
    const summaryFile = path.join(TMP_DIR, 'summary.yml');
    
    try {
        // Read and parse YAML files
        const beforeData = yaml.load(fs.readFileSync(beforeFile, 'utf8')) || { errors: [] };
        const afterData = yaml.load(fs.readFileSync(afterFile, 'utf8')) || { errors: [] };
        
        // Create file maps for easier comparison
        const beforeFiles = createFileMap(beforeData);
        const afterFiles = createFileMap(afterData);
        
        // Get all unique filenames
        const allFiles = new Set([...Object.keys(beforeFiles), ...Object.keys(afterFiles)]);
        
        const summary = {
            timestamp: new Date().toISOString(),
            total_files_processed: allFiles.size,
            file_results: {},
            overall_stats: {
                total_errors_before: 0,
                total_errors_after: 0,
                files_improved: 0,
                files_degraded: 0,
                files_unchanged: 0,
                new_errors_introduced: 0
            }
        };
        
        // Analyze each file
        allFiles.forEach(filename => {
            const beforeErrors = beforeFiles[filename] || [];
            const afterErrors = afterFiles[filename] || [];
            
            const beforeCount = beforeErrors.length;
            const afterCount = afterErrors.length;
            const errorDelta = afterCount - beforeCount;
            
            // Find new errors introduced
            const beforeErrorCodes = new Set(beforeErrors.map(e => `${e.code}:${e.line}`));
            const newErrors = afterErrors.filter(e => !beforeErrorCodes.has(`${e.code}:${e.line}`));
            
            summary.file_results[filename] = {
                errors_before: beforeCount,
                errors_after: afterCount,
                error_delta: errorDelta,
                improvement: errorDelta < 0,
                new_errors: newErrors.map(e => ({
                    code: e.code,
                    line: e.line,
                    message: e.message
                }))
            };
            
            // Update overall stats
            summary.overall_stats.total_errors_before += beforeCount;
            summary.overall_stats.total_errors_after += afterCount;
            summary.overall_stats.new_errors_introduced += newErrors.length;
            
            if (errorDelta < 0) {
                summary.overall_stats.files_improved++;
            } else if (errorDelta > 0) {
                summary.overall_stats.files_degraded++;
            } else {
                summary.overall_stats.files_unchanged++;
            }
        });
        
        // Calculate overall improvement
        summary.overall_stats.error_reduction_count = summary.overall_stats.total_errors_before - summary.overall_stats.total_errors_after;
        summary.overall_stats.error_reduction_percentage = summary.overall_stats.total_errors_before > 0 
            ? ((summary.overall_stats.error_reduction_count / summary.overall_stats.total_errors_before) * 100).toFixed(2)
            : '0.00';
        
        // Count remaining errors by type and calculate increases
        const remainingErrorCounts = {};
        const beforeErrorCounts = {};
        const errorIncreases = {};
        
        // Count errors before fix
        Object.values(beforeFiles).forEach(errors => {
            errors.forEach(error => {
                const errorCode = error.code;
                beforeErrorCounts[errorCode] = (beforeErrorCounts[errorCode] || 0) + 1;
            });
        });
        
        // Count errors after fix
        Object.values(afterFiles).forEach(errors => {
            errors.forEach(error => {
                const errorCode = error.code;
                remainingErrorCounts[errorCode] = (remainingErrorCounts[errorCode] || 0) + 1;
            });
        });
        
        // Calculate increases for each error type
        Object.keys(remainingErrorCounts).forEach(errorCode => {
            const beforeCount = beforeErrorCounts[errorCode] || 0;
            const afterCount = remainingErrorCounts[errorCode] || 0;
            errorIncreases[errorCode] = afterCount - beforeCount;
        });
        
        // Sort errors by increase (descending) and convert to array
        summary.remaining_errors = Object.entries(remainingErrorCounts)
            .sort(([codeA, countA], [codeB, countB]) => {
                const increaseA = errorIncreases[codeA];
                const increaseB = errorIncreases[codeB];
                // Primary sort: by increase (descending)
                if (increaseA !== increaseB) {
                    return increaseB - increaseA;
                }
                // Secondary sort: by count (descending)
                return countB - countA;
            })
            .map(([code, count]) => ({
                error_code: code,
                count: count,
                increase: errorIncreases[code]
            }));
        
        // Split summary into two files
        const mainSummary = {
            timestamp: summary.timestamp,
            total_files_processed: summary.total_files_processed,
            overall_stats: summary.overall_stats,
            remaining_errors: summary.remaining_errors
        };
        
        const fileResults = {
            timestamp: summary.timestamp,
            file_results: summary.file_results
        };
        
        // Write main summary
        const summaryYaml = yaml.dump(mainSummary, { indent: 2, lineWidth: 120 });
        fs.writeFileSync(summaryFile, summaryYaml);
        
        // Write file results
        const fileResultsFile = path.join(TMP_DIR, 'file_results.yml');
        const fileResultsYaml = yaml.dump(fileResults, { indent: 2, lineWidth: 120 });
        fs.writeFileSync(fileResultsFile, fileResultsYaml);
        
        console.log('Summary generated:');
        console.log(`- Total files: ${summary.total_files_processed}`);
        console.log(`- Errors before: ${summary.overall_stats.total_errors_before}`);
        console.log(`- Errors after: ${summary.overall_stats.total_errors_after}`);
        console.log(`- Error reduction: ${summary.overall_stats.error_reduction_count} (${summary.overall_stats.error_reduction_percentage}%)`);
        console.log(`- Files improved: ${summary.overall_stats.files_improved}`);
        console.log(`- Files degraded: ${summary.overall_stats.files_degraded}`);
        console.log(`- New errors introduced: ${summary.overall_stats.new_errors_introduced}`);
        console.log(`Summary saved to ${summaryFile}`);
        console.log(`File results saved to ${fileResultsFile}`);
        
    } catch (error) {
        console.error('Error generating summary:', error.message);
        throw error;
    }
}

function createFileMap(data) {
    const map = {};
    
    // Handle the actual YAML structure from norminette
    if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach(error => {
            const filePath = error.file;
            if (!map[filePath]) {
                map[filePath] = [];
            }
            map[filePath].push({
                code: error.error_code,
                line: error.line,
                message: error.description
            });
        });
    }
    
    return map;
}

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main };