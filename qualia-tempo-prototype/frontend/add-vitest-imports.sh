#!/bin/bash
for file in $(find src -name "*.test.ts" -o -name "*.test.tsx"); do
  if ! grep -q "import.*vitest" "$file"; then
    # Check if file contains test functions
    if grep -q "describe\|test\|expect\|beforeEach\|afterEach\|vi\." "$file"; then
      # Add vitest imports at the top
      sed -i '1i import { describe, test, expect, beforeEach, afterEach, vi } from '\''vitest'\'';' "$file"
    fi
  fi
done
