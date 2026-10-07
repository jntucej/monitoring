#!/bin/bash

# Create an archive folder
mkdir -p docs/archived

# Move old/log files to archive
mv docs/LOG_ANALYSIS_*.md docs/archived/ 2>/dev/null
mv docs/repomix-output.md docs/archived/ 2>/dev/null
mv docs/ANNEXURE_*.html docs/archived/ 2>/dev/null
mv docs/ANNEXURE_*.jpeg docs/archived/ 2>/dev/null
mv docs/ANNEXURE_*.png docs/archived/ 2>/dev/null
mv docs/ANNEXURE_*.pdf docs/archived/ 2>/dev/null

# Keep only essential docs
echo "✅ Archived old docs. Keeping only essential ones."
echo "📁 Essential docs:"
ls docs/*.md | grep -v archived | head -10
