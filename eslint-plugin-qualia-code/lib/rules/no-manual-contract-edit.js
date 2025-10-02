/**
 * @fileoverview Rule to prevent manual editing of auto-generated contract files
 * @author Qualia Tempo Team
 */

'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent manual editing of auto-generated contract files',
      category: 'Best Practices',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      noManualEdit: 'This is an auto-generated file. Do not edit manually. Modify the JSON schema in /shared_contracts and run scripts/generate_contracts.sh.'
    }
  },

  create(context) {
    const filename = context.getFilename();
    
    // Check if this is a generated contract file
    // Only flag files in /types/ directory that are generated from /shared_contracts
    // Do NOT flag hand-written service contracts in /services/contracts/
    // Do NOT flag manual type definition files (electron.d.ts, glsl-parser.d.ts, etc.)
    const isPotentiallyGeneratedFile =
      filename.includes('api/models.py') ||
      (filename.includes('/types/') && filename.endsWith('.d.ts')) ||
      (filename.includes('/types/contracts.ts'));

    if (!isPotentiallyGeneratedFile) {
      return {}; // No rules to apply for non-generated contract files
    }

    return {
      Program(node) {
        const sourceCode = context.getSourceCode();
        const text = sourceCode.getText();
        
        // Only report if the file has generation markers
        // This distinguishes auto-generated files from manual type definitions
        const hasGenerationMarker = 
          text.includes('GENERATED FILE - DO NOT EDIT') ||
          text.includes('@generated DO NOT EDIT') ||
          text.includes('automatically generated from JSON schema');
        
        if (hasGenerationMarker) {
          context.report({
            node,
            messageId: 'noManualEdit',
            loc: { line: 1, column: 0 }
          });
        }
      }
    };
  }
};
