#!/bin/bash

# Norminette Accuracy Measurement Script
# This script runs a comprehensive test of the norminette auto-fix functionality

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🧪 Starting Norminette Accuracy Measurement"
echo "Project root: $PROJECT_ROOT"
echo

# Check if the project is built
if [ ! -f "dist/index.js" ]; then
    echo "⚠️  Project not built. Building now..."
    npm run build
    echo "✅ Build completed"
    echo
fi

# Run the accuracy measurement
echo "🔍 Running accuracy measurement..."
node test/accuracy-measurement.js

echo
echo "📊 Results Summary:"
if [ -f "tmp/summary.yml" ]; then
    echo "Results have been saved to tmp/ directory:"
    echo "  - tmp/before.yml      : Errors before fix"
    echo "  - tmp/after.yml       : Errors after fix"
    echo "  - tmp/summary.yml     : Overall statistics and error analysis"
    echo "  - tmp/file_results.yml: Detailed file-by-file results"
    echo
    echo "📈 Quick Stats:"
    if command -v yq >/dev/null 2>&1; then
        # Use yq if available for prettier output
        echo "Files processed: $(yq '.total_files_processed' tmp/summary.yml)"
        echo "Errors before: $(yq '.overall_stats.total_errors_before' tmp/summary.yml)"
        echo "Errors after: $(yq '.overall_stats.total_errors_after' tmp/summary.yml)"
        echo "Error reduction: $(yq '.overall_stats.error_reduction_percentage' tmp/summary.yml)%"
        echo "Files improved: $(yq '.overall_stats.files_improved' tmp/summary.yml)"
        echo "Files degraded: $(yq '.overall_stats.files_degraded' tmp/summary.yml)"
        echo "New errors introduced: $(yq '.overall_stats.new_errors_introduced' tmp/summary.yml)"
    else
        # Fallback to basic grep/awk
        echo "Files processed: $(grep 'total_files_processed:' tmp/summary.yml | awk '{print $2}')"
        echo "Errors before: $(grep 'total_errors_before:' tmp/summary.yml | awk '{print $2}')"
        echo "Errors after: $(grep 'total_errors_after:' tmp/summary.yml | awk '{print $2}')"
        echo "Error reduction: $(grep 'error_reduction_percentage:' tmp/summary.yml | awk '{print $2}')%"
        echo "Files improved: $(grep 'files_improved:' tmp/summary.yml | awk '{print $2}')"
        echo "Files degraded: $(grep 'files_degraded:' tmp/summary.yml | awk '{print $2}')"
        echo "New errors introduced: $(grep 'new_errors_introduced:' tmp/summary.yml | awk '{print $2}')"
    fi
else
    echo "❌ Summary file not found. Check for errors above."
    exit 1
fi

echo
echo "✅ Accuracy measurement completed successfully!"
echo "📂 View results:"
echo "  - Overall: cat tmp/summary.yml"
echo "  - File details: cat tmp/file_results.yml"