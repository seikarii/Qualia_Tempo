#!/bin/bash

# Script to truncate CHANGELOG.md to first 300 lines
# This helps maintain changelog size by keeping only recent entries

set -e  # Exit on any error

CHANGELOG_FILE="CHANGELOG.md"

if [ ! -f "$CHANGELOG_FILE" ]; then
    echo "Error: $CHANGELOG_FILE not found in current directory"
    exit 1
fi

echo "Truncating $CHANGELOG_FILE to first 300 lines..."
head -n 300 "$CHANGELOG_FILE" > "${CHANGELOG_FILE}.tmp"
mv "${CHANGELOG_FILE}.tmp" "$CHANGELOG_FILE"

echo "✅ CHANGELOG.md successfully truncated to 300 lines"
echo "📊 New file size: $(wc -l < "$CHANGELOG_FILE") lines"
