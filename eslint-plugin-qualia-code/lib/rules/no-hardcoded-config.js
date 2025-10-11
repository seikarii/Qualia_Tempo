/**
 * @fileoverview SALA: Semantic Configuration Value Detection
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ FULLY SEMANTIC - TypeChecker + heuristics to analyze assignment targets
 * UPGRADED: Session 34 - TypeChecker integration per Senior Architect audit
 * AUDIT NOTE (Senior Architect): "Esta regla es inherentemente heurística, pero puede mejorarse con TypeChecker para detectar asignaciones a variables de tipo XYZConfig"
 */

'use strict';

const { requireTypeChecker, getNodeType } = require('../utils/semantic-helpers');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent hardcoded configuration values using TypeChecker for assignment target analysis',
      category: 'Best Practices',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          allowedValues: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          allowedNumbers: {
            type: 'array',
            items: {
              type: 'number'
            }
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      noHardcodedConfig: 'Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService.',
      noHardcodedConfigTyped: 'QUALIA.CODE §5: Literal assigned to Config interface type. Value: "{{value}}" assigned to "{{targetType}}". Externalize to YAML config file.'
    }
  },

  create(context) {
    // Try to get TypeChecker for semantic analysis
    let checker, tsNodeMap;
    try {
      const tcResult = requireTypeChecker(context);
      checker = tcResult.checker;
      tsNodeMap = tcResult.tsNodeMap;
    } catch {
      // Fall back to heuristic-only mode
      checker = null;
      tsNodeMap = null;
    }

    const options = context.options[0] || {};
    const allowedValues = new Set(options.allowedValues || [
      '', 'true', 'false', 'null', 'undefined',
      // Common event names and types
      'QualiaStateUpdated', 'GameStateChanged', 'PlayerAction', 'CombatData',
      'intensity', 'precision', 'flow', 'chaos', 'aggression', 'recovery', 'transcendence',
      // Common service names
      'EventBus', 'ConfigurationService', 'BackendSyncService', 'GameControllerService',
      'QualiaStateCalculatorService', 'GameStateStoreService', 'ErrorReportingService',
      'DebugService', 'CompositionRoot'
    ]);
    const allowedNumbers = new Set(options.allowedNumbers || [0, 1, -1]);

    function isInServiceContext(node) {
      const filename = context.getFilename();
      return filename.includes('/services/') || filename.includes('Service.ts') || filename.includes('Service.tsx');
    }

    function isConfigurationServiceContext(node) {
      const filename = context.getFilename();
      return filename.includes('ConfigurationService.ts') || filename.includes('ConfigurationService.tsx');
    }

    function isErrorMessage(node) {
      // Check if this string is part of an error message, console log, or warning
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'NewExpression' && parent.callee?.name === 'Error') {
          return true;
        }
        if (parent.type === 'ThrowStatement') {
          return true;
        }
        if (parent.type === 'CallExpression' && parent.callee) {
          // Handle console.* calls
          if (parent.callee.type === 'MemberExpression' && 
              parent.callee.object?.name === 'console') {
            return true;
          }
          // Handle logger.* calls (e.g., this.logger.info, logger.error)
          if (parent.callee.type === 'MemberExpression' && 
              parent.callee.property && 
              ['error', 'warn', 'log', 'info', 'debug'].includes(parent.callee.property.name)) {
            return true;
          }
          // Handle direct function calls for logging
          const functionName = parent.callee.name;
          if (functionName && ['error', 'warn', 'log', 'info', 'debug'].includes(functionName)) {
            return true;
          }
        }
        parent = parent.parent;
      }
      return false;
    }

    function isEventNameOrType(node) {
      // Check if this is an event name, type name, or similar identifier
      const value = node.value;
      if (typeof value !== 'string') return false;

      // Event names typically end with specific patterns
      if (value.match(/(Updated|Changed|Started|Stopped|Error|Success|Failed|Event|Action|State)$/)) {
        return true;
      }

      // Type names or interface names (PascalCase)
      if (value.match(/^[A-Z][a-zA-Z]*$/)) {
        return true;
      }

      // Event types with underscores (like NARRATIVE_EVENT)
      if (value.match(/^[A-Z_]+$/)) {
        return true;
      }

      // Common event type patterns
      if (value.includes('_EVENT') || value.includes('_ACTION') || value.includes('_STATE')) {
        return true;
      }

      return false;
    }

    function isLegitimateConfigServiceValue(node) {
      const value = node.value;

      // Allow configuration file paths
      if (typeof value === 'string' && (
        value.includes('/config/') ||
        value.includes('.yaml') ||
        value.includes('.yml') ||
        value.includes('.json')
      )) {
        return true;
      }

      // Allow error messages in ConfigurationService (they're legitimate)
      if (isErrorMessage(node)) {
        return true;
      }

      // Allow small numbers for validation, indexing, etc.
      if (typeof value === 'number' && Number.isInteger(value) && Math.abs(value) <= 100) {
        return true;
      }

      // Allow boolean values
      if (typeof value === 'boolean') {
        return true;
      }

      // Allow null/undefined
      if (value === null || value === undefined) {
        return true;
      }

      // Allow short descriptive strings that are part of the service logic
      if (typeof value === 'string' && value.length <= 50 && (
        value.includes('[Config]') || // Log prefixes
        value.includes('configuration') ||
        value.includes('config') ||
        value.includes('loaded') ||
        value.includes('failed')
      )) {
        return true;
      }

      return false;
    }

    function isGameStateOrResetValue(node) {
      // Check if this value is part of game state initialization or reset
      let parent = node.parent;
      let depth = 0;
      const maxDepth = 5;
      
      while (parent && depth < maxDepth) {
        // Check for property names that indicate game state
        if (parent.type === 'Property' && parent.key) {
          const propName = parent.key.name || parent.key.value;
          if (propName && typeof propName === 'string') {
            // Game state properties that should allow reset values
            const gameStateProps = [
              'health', 'combo', 'score', 'position', 'x', 'y', 'z',
              'currentTime', 'gameStartTime', 'totalNotes', 'notesHit', 'notesMissed',
              'currentStreak', 'maxStreak', 'pauseCooldownRemaining', 'isMoving',
              'lastRhythmHit', 'isPlaying', 'intensity', 'precision', 'aggression',
              'flow', 'chaos', 'recovery', 'transcendence'
            ];
            
            if (gameStateProps.includes(propName)) {
              return true;
            }
          }
        }
        
        // Check for object expressions in state setting contexts
        if (parent.type === 'ObjectExpression') {
          let grandParent = parent.parent;
          while (grandParent && depth < maxDepth) {
            // Look for state setting patterns
            if (grandParent.type === 'CallExpression' && grandParent.callee) {
              const calleeName = grandParent.callee.name || 
                                (grandParent.callee.property && grandParent.callee.property.name);
              
              if (calleeName === 'setStore' || calleeName === 'setState') {
                return true;
              }
            }
            grandParent = grandParent.parent;
            depth++;
          }
        }
        
        parent = parent.parent;
        depth++;
      }
      
      return false;
    }

    function isMathematicalExpression(node) {
      // Check if this number is part of a mathematical expression
      let parent = node.parent;
      let depth = 0;
      const maxDepth = 3;
      
      while (parent && depth < maxDepth) {
        // Check for Math.* function calls
        if (parent.type === 'CallExpression' && parent.callee) {
          if (parent.callee.type === 'MemberExpression' && 
              parent.callee.object?.name === 'Math') {
            return true;
          }
        }
        
        // Check for binary expressions (arithmetic operations)
        if (parent.type === 'BinaryExpression' && 
            ['+', '-', '*', '/', '%', '>>', '<<', '>>>'].includes(parent.operator)) {
          return true;
        }
        
        // Check for unary expressions (negation, etc.)
        if (parent.type === 'UnaryExpression') {
          return true;
        }
        
        parent = parent.parent;
        depth++;
      }
      
      return false;
    }

    function isSystemFunctionCall(node) {
      // Check if this is a call to a system function like Date.now()
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'CallExpression' && parent.callee) {
          const calleeStr = parent.callee.type === 'MemberExpression' 
            ? `${parent.callee.object.name}.${parent.callee.property.name}`
            : parent.callee.name;
            
          if (calleeStr === 'Date.now' || calleeStr === 'Math.random' || 
              calleeStr === 'Math.floor' || calleeStr === 'performance.now') {
            return true;
          }
        }
        parent = parent.parent;
      }
      return false;
    }

    function isImportPathOrModuleName(node) {
      // Check if this string is part of an import/export statement
      let parent = node.parent;
      let depth = 0;
      const maxDepth = 3;
      
      while (parent && depth < maxDepth) {
        if (parent.type === 'ImportDeclaration' || parent.type === 'ExportDeclaration') {
          return true;
        }
        // Also check for import() dynamic imports
        if (parent.type === 'CallExpression' && parent.callee?.name === 'import') {
          return true;
        }
        parent = parent.parent;
        depth++;
      }

      // Check if this looks like a module path or file extension
      if (typeof node.value === 'string') {
        const value = node.value;
        if (value.startsWith('./') || value.startsWith('../') || 
            value.startsWith('/') || value.includes('.ts') || 
            value.includes('.tsx') || value.includes('.js') ||
            value.includes('.json') || value.includes('.yaml')) {
          return true;
        }
      }

      return false;
    }

    function isTypeDefinition(node) {
      // Check if this string is part of a type definition or interface
      let parent = node.parent;
      let depth = 0;
      const maxDepth = 5;
      
      while (parent && depth < maxDepth) {
        // TypeScript type annotations and properties
        if (parent.type === 'TSTypeAnnotation' || 
            parent.type === 'TSInterfaceDeclaration' ||
            parent.type === 'TSTypeAliasDeclaration' ||
            parent.type === 'TSPropertySignature' ||
            parent.type === 'TSLiteralType') {
          return true;
        }
        
        // Property definitions in interfaces or object types
        if (parent.type === 'Property' && parent.key === node) {
          // This is a property key, likely legitimate
          return true;
        }
        
        parent = parent.parent;
        depth++;
      }

      return false;
    }

    function isHttpOrApiRelated(node) {
      const value = node.value;
      if (typeof value !== 'string') return false;
      
      // HTTP methods
      if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(value)) {
        return true;
      }
      
      // HTTP headers
      if (['Content-Type', 'Authorization', 'Accept', 'User-Agent'].includes(value)) {
        return true;
      }
      
      // MIME types
      if (value.includes('application/') || value.includes('text/') || value.includes('image/')) {
        return true;
      }
      
      return false;
    }

    function isLegitimateHardcodedValue(node) {
      const value = node.value;

      // Allow import/export paths
      if (isImportPathOrModuleName(node)) {
        return false;
      }

      // Allow type definitions and interface properties
      if (isTypeDefinition(node)) {
        return false;
      }

      // Allow HTTP/API related strings
      if (isHttpOrApiRelated(node)) {
        return false;
      }

      // Allow game state and reset values
      if (isGameStateOrResetValue(node)) {
        return false;
      }

      // Allow system function calls
      if (isSystemFunctionCall(node)) {
        return false;
      }

      // Allow very short strings (likely not configuration)
      if (typeof value === 'string' && value.length <= 3) {
        return false;
      }

      // Allow error messages
      if (isErrorMessage(node)) {
        return false;
      }

      // Allow event names and type names
      if (isEventNameOrType(node)) {
        return false;
      }

      // Allow HTML/CSS class names and IDs
      if (typeof value === 'string' && value.match(/^[a-z-]+$/)) {
        return false;
      }

      // Allow import/export related strings
      if (typeof value === 'string' && value.includes('/') && value.match(/\.(ts|js|json)$/)) {
        return false;
      }

      // Allow hexadecimal literals (commonly used for bit masks, flags, etc.)
      if (typeof value === 'number' && node.raw && node.raw.startsWith('0x')) {
        return false;
      }

      // Allow numbers in mathematical expressions (Math.pow, division, etc.)
      if (isMathematicalExpression(node)) {
        return false;
      }

      // Only flag numbers that look like configuration values
      if (typeof value === 'number') {
        // Allow small integers commonly used for array indexing, boolean conversion, etc.
        // But be more restrictive for values that look like configuration
        if (Number.isInteger(value) && Math.abs(value) <= 10) {
          return false; // Allow 0-10 for indexing, flags, etc.
        }
        
        // Flag small numbers that look like configuration (retries, limits, etc.)
        if (Number.isInteger(value) && Math.abs(value) > 10 && Math.abs(value) <= 100) {
          // Allow only very common small values
          const commonSmallValues = [12, 24, 30, 31, 60, 100];
          if (!commonSmallValues.includes(Math.abs(value))) {
            return true; // Flag as potential hardcoded config
          }
        }

        // Allow common mathematical constants
        if (value === Math.PI || value === Math.E) {
          return false;
        }

        // Allow very common default values (expanded for game state)
        if ([0, 1, 100, 1000].includes(value)) {
          return false;
        }

        // Allow common time intervals (milliseconds) - but flag suspicious values
        if (Number.isInteger(value) && value >= 50 && value <= 10000 && value % 50 === 0) {
          // Allow only very common intervals, flag others as potential config
          const commonIntervals = [100, 200, 250, 300, 500, 1000, 2000, 3000, 10000];
          if (!commonIntervals.includes(value)) {
            return true; // Flag as potential hardcoded config
          }
          return false;
        }

        // Flag numbers that look like configuration (very large numbers, specific thresholds)
        if (value > 10000 || value < -1000) {
          return true;
        }

        // Allow common decimal values (percentages, ratios, etc.)
        if (!Number.isInteger(value)) {
          // Allow common percentage/ratio values
          if (value >= 0 && value <= 1) {
            return false; // Allow any decimal between 0 and 1 (common for game percentages)
          }
          // Allow common multipliers
          if (value === 0.5 || value === 1.5 || value === 2.0) {
            return false;
          }
          // Flag other large decimal numbers as potential configuration
          if (Math.abs(value) > 100) {
            return true;
          }
          return false; // Allow smaller decimals
        }
      }

      // Flag long strings that are likely configuration
      if (typeof value === 'string' && value.length > 50) {
        return true;
      }

      // Allow localhost/development URLs
      if (typeof value === 'string' && (
        value.includes('localhost') ||
        value.includes('127.0.0.1') ||
        value.includes('0.0.0.0')
      )) {
        return false;
      }

      // Allow API endpoint paths
      if (typeof value === 'string' && value.startsWith('/')) {
        return false;
      }

      // Flag strings that look like URLs, file paths, or configuration keys
      if (typeof value === 'string' && (
        value.includes('http') ||
        value.includes('://') ||
        value.includes('.com') ||
        value.includes('.org') ||
        value.includes('/api/') ||
        value.match(/^[A-Z_]+$/) // ALL_CAPS likely configuration keys
      )) {
        return true;
      }

      return false;
    }

    /**
     * TypeChecker-based semantic analysis: Check if literal is assigned to a Config interface type
     */
    function isAssignedToConfigType(node) {
      if (!checker || !tsNodeMap) return null;

      let parent = node.parent;
      let depth = 0;
      const maxDepth = 5;

      while (parent && depth < maxDepth) {
        // Check variable declarations: const timeout = 5000;
        if (parent.type === 'VariableDeclarator' && parent.id) {
          const tsNode = tsNodeMap.get(parent.id);
          if (tsNode) {
            const type = getNodeType(tsNode, checker, tsNodeMap);
            if (type) {
              const typeName = checker.typeToString(type);
              // Check if type name ends with "Config" or is a property of a Config interface
              if (typeName.includes('Config') || typeName.includes('config')) {
                return { targetType: typeName };
              }
            }
          }
        }

        // Check property assignments: this.config.timeout = 5000;
        if (parent.type === 'AssignmentExpression' && parent.left) {
          const tsNode = tsNodeMap.get(parent.left);
          if (tsNode) {
            const type = getNodeType(tsNode, checker, tsNodeMap);
            if (type) {
              const typeName = checker.typeToString(type);
              if (typeName.includes('Config') || typeName.includes('config')) {
                return { targetType: typeName };
              }
            }
          }
        }

        // Check object properties: const config = { timeout: 5000 };
        if (parent.type === 'Property' && parent.value === node) {
          let objectParent = parent.parent;
          if (objectParent && objectParent.parent) {
            const tsNode = tsNodeMap.get(objectParent.parent);
            if (tsNode) {
              const type = getNodeType(tsNode, checker, tsNodeMap);
              if (type) {
                const typeName = checker.typeToString(type);
                if (typeName.includes('Config') || typeName.includes('config')) {
                  return { targetType: typeName, propertyName: parent.key.name };
                }
              }
            }
          }
        }

        parent = parent.parent;
        depth++;
      }

      return null;
    }

    return {
      Literal(node) {
        // Only check in service contexts
        if (!isInServiceContext(node)) {
          return;
        }

        // Skip allowed values
        if (typeof node.value === 'string' && allowedValues.has(node.value)) {
          return;
        }

        if (typeof node.value === 'number' && allowedNumbers.has(node.value)) {
          return;
        }

        // Special handling for ConfigurationService
        if (isConfigurationServiceContext(node)) {
          // Allow legitimate configuration-related values in ConfigurationService
          if (isLegitimateConfigServiceValue(node)) {
            return;
          }
        }

        // SEMANTIC ANALYSIS FIRST: Check if assigned to Config interface type (TypeChecker)
        const configTypeResult = isAssignedToConfigType(node);
        if (configTypeResult) {
          context.report({
            node,
            messageId: 'noHardcodedConfigTyped',
            data: {
              value: node.value,
              targetType: configTypeResult.targetType
            }
          });
          return;
        }

        // FALLBACK HEURISTICS: Only flag values that are legitimately hardcoded configuration
        if (isLegitimateHardcodedValue(node)) {
          context.report({
            node,
            messageId: 'noHardcodedConfig'
          });
        }
      }
    };
  }
};
