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
    const isContractFile = 
      filename.includes('api/models.py') || 
      filename.includes('types/contracts.ts') ||
      filename.includes('contracts.ts');

    if (!isContractFile) {
      return {}; // No rules to apply for non-contract files
    }

    return {
      Program(node) {
        const sourceCode = context.getSourceCode();
        const text = sourceCode.getText();
        
        // Check for the @generated marker
        if (!text.includes('@generated DO NOT EDIT')) {
          context.report({
            node,
            messageId: 'noManualEdit',
            loc: { line: 1, column: 0 }
          });
          return;
        }

        // Additional check: if the file has been modified after generation,
        // we could potentially check timestamps or content hashes here
        // For now, we rely on the @generated marker being present
      }
    };
  }
};
