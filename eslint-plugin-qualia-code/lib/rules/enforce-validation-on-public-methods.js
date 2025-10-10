/**
 * @fileoverview Enforce @validate decorator on public methods accepting complex objects
 * @author Qualia Tempo Team
 * 
 * QUALIA.CODE COMPLIANCE: Data Integrity (§6)
 * 
 * This rule ensures that public methods receiving complex objects from external
 * sources have the @validate decorator to enforce schema validation. This prevents
 * corrupted or malformed data from entering the system.
 * 
 * CRITERIA FOR "COMPLEX OBJECT":
 * - Parameter type is NOT a primitive (string, number, boolean, null, undefined)
 * - Parameter type is NOT Array<primitive>
 * - Parameter type is a custom interface/type
 * - Method is public (not private, protected, or starts with _)
 * - Method is NOT a constructor, getter, or setter
 * 
 * EXEMPTIONS:
 * - // @validate-exempt: [reason] comment above method
 * - Private methods (start with _ or have private modifier)
 * - Methods already decorated with @validate
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce @validate decorator on public methods accepting complex objects',
      category: 'Data Integrity',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#data-integrity'
    },
    messages: {
      missingValidation: 'Public method "{{methodName}}" accepts complex object "{{paramName}}: {{paramType}}" but lacks @validate decorator. Add @validate(\'{{schemaName}}\') or exempt with // @validate-exempt: [reason].'
    },
    schema: [],
    fixable: null
  },

  create(context) {
    const sourceCode = context.getSourceCode();

    function isPrimitiveType(typeAnnotation) {
      if (!typeAnnotation) return true; // No type = assume safe
      
      const typeNode = typeAnnotation.typeAnnotation;
      if (!typeNode) return true;

      // Primitive types
      if (typeNode.type === 'TSStringKeyword') return true;
      if (typeNode.type === 'TSNumberKeyword') return true;
      if (typeNode.type === 'TSBooleanKeyword') return true;
      if (typeNode.type === 'TSNullKeyword') return true;
      if (typeNode.type === 'TSUndefinedKeyword') return true;
      if (typeNode.type === 'TSVoidKeyword') return true;
      if (typeNode.type === 'TSAnyKeyword') return true; // any is treated as safe

      // Array of primitives
      if (typeNode.type === 'TSArrayType') {
        return isPrimitiveType({ typeAnnotation: typeNode.elementType });
      }

      // Union types - all must be primitive
      if (typeNode.type === 'TSUnionType') {
        return typeNode.types.every(t => isPrimitiveType({ typeAnnotation: t }));
      }

      // Everything else is complex (interfaces, custom types, etc.)
      return false;
    }

    function hasValidateDecorator(node) {
      if (!node.decorators) return false;
      
      return node.decorators.some(decorator => {
        if (decorator.expression.type === 'Identifier') {
          return decorator.expression.name === 'validate';
        }
        if (decorator.expression.type === 'CallExpression') {
          return decorator.expression.callee.name === 'validate';
        }
        return false;
      });
    }

    function hasValidateExemptComment(node) {
      const comments = sourceCode.getCommentsBefore(node);
      return comments.some(comment => 
        comment.value.includes('@validate-exempt')
      );
    }

    function isPublicMethod(node) {
      // Exclude constructors, getters, setters
      if (node.kind === 'constructor') return false;
      if (node.kind === 'get' || node.kind === 'set') return false;
      
      // Check if method name starts with underscore (private by convention)
      if (node.key && node.key.name && node.key.name.startsWith('_')) return false;
      
      // Check accessibility modifier
      if (node.accessibility === 'private' || node.accessibility === 'protected') return false;
      
      // If no accessibility modifier, it's public by default in TypeScript
      return true;
    }

    function getTypeString(typeAnnotation) {
      if (!typeAnnotation || !typeAnnotation.typeAnnotation) return 'unknown';
      
      const typeNode = typeAnnotation.typeAnnotation;
      const code = sourceCode.getText(typeNode);
      return code.length > 50 ? code.substring(0, 50) + '...' : code;
    }

    function generateSchemaName(paramName, typeString) {
      // Generate a reasonable schema name from parameter name
      const baseName = paramName.charAt(0).toUpperCase() + paramName.slice(1);
      return `${baseName}Schema`;
    }

    return {
      MethodDefinition(node) {
        // Only check public methods
        if (!isPublicMethod(node)) return;
        
        // Skip if already has @validate
        if (hasValidateDecorator(node)) return;
        
        // Skip if has exemption comment
        if (hasValidateExemptComment(node)) return;
        
        // Check each parameter
        const methodName = node.key.name || 'anonymous';
        
        if (node.value && node.value.params) {
          node.value.params.forEach(param => {
            // Skip this parameter (self reference)
            if (param.type === 'Identifier' && param.name === 'this') return;
            
            // Skip rest parameters (... spread)
            if (param.type === 'RestElement') return;
            
            const paramName = param.name || 'parameter';
            const typeAnnotation = param.typeAnnotation;
            
            // Check if type is complex
            if (!isPrimitiveType(typeAnnotation)) {
              const typeString = getTypeString(typeAnnotation);
              const schemaName = generateSchemaName(paramName, typeString);
              
              context.report({
                node,
                messageId: 'missingValidation',
                data: {
                  methodName,
                  paramName,
                  paramType: typeString,
                  schemaName
                }
              });
            }
          });
        }
      }
    };
  }
};
