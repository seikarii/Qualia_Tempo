/**
 * @fileoverview SALA: Test container isolation enforcement via symbol analysis
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
const { requireTypeChecker } = require('../utils/semantic-helpers');
module.exports = {
  meta: {
    type: 'error',
    docs: { description: 'Enforce isolated containers in tests', category: 'QUALIA.CODE - Testing', recommended: true },
    schema: [],
    messages: {
      sharedContainer: 'QUALIA.CODE §8: Test file shares container across tests. Use createTestContainer() inside each test for isolation.'
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('.test.') && !filename.includes('.spec.')) return {};

    let containerDeclaredOutsideTest = false;
    let containerVariableName = null;

    return {
      VariableDeclarator(node) {
        const ancestors = context.getAncestors();
        const insideTestBlock = ancestors.some(a => 
          a.type === 'CallExpression' && 
          (a.callee?.name === 'it' || a.callee?.name === 'test' || a.callee?.name === 'describe')
        );

        const isContainer = node.init?.callee?.name === 'createTestContainer' || 
                           node.id.name?.toLowerCase().includes('container');

        if (isContainer && !insideTestBlock) {
          containerDeclaredOutsideTest = true;
          containerVariableName = node.id.name;
        }
      },

      'Program:exit'() {
        if (containerDeclaredOutsideTest) {
          context.report({ 
            node: context.getSourceCode().ast, 
            messageId: 'sharedContainer' 
          });
        }
      }
    };
  }
};
