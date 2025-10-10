/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-cache-decorator
 * 
 * QUALIA.CODE §8.1 - Pure calculation methods that are called frequently SHOULD use @cache or @memoize
 * decorator to avoid redundant computation.
 * 
 * RATIONALE:
 * - Visual calculations (getBossVisuals, calculateAccuracy) run at 60 FPS
 * - Pure functions with identical inputs should return cached results
 * - Frame-based caching prevents performance degradation
 * 
 * DETECTS:
 * - Methods with "calculate", "compute", "transform" in name
 * - Methods in ViewLogicService (visual calculations)
 * - Pure functions with no side effects
 * 
 * EXCEPTIONS:
 * - Methods already using @cache or @memoize
 * - Methods with @performance exemption comment
 * - Non-deterministic methods (Math.random, Date.now)
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Suggest @cache decorator for expensive pure calculation methods',
      category: 'QUALIA.CODE Performance',
      recommended: false, // Suggestion, not error
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#81-performance-optimization'
    },
    fixable: null,
    schema: [],
    messages: {
      suggestCache: 'Method "{{methodName}}" appears to be a pure calculation. Consider @cache decorator for performance. (QUALIA.CODE §8.1)',
      frequentCalculation: 'Method "{{methodName}}" in {{serviceName}} may be called frequently. Consider caching results.',
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Skip test files
    if (filename.includes('.test.') || filename.includes('.spec.') || filename.includes('__tests__')) {
      return {};
    }

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    // Focus on services where caching is critical
    const criticalServices = [
      'ViewLogicService',
      'QualiaStateCalculatorService',
      'CoordinateSystemService',
    ];

    const isCriticalService = criticalServices.some(service => filename.includes(service));

    function hasDecorator(node, ...decoratorNames) {
      if (!node.decorators || !Array.isArray(node.decorators)) {
        return false;
      }

      return node.decorators.some(decorator => {
        const name = decorator.expression?.name || decorator.expression?.callee?.name;
        return decoratorNames.includes(name);
      });
    }

    function getServiceName(node) {
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'ClassDeclaration' && parent.id?.name) {
          return parent.id.name;
        }
        parent = parent.parent;
      }
      return 'Unknown';
    }

    function isPureCalculationMethod(node) {
      const methodName = node.key?.name || '';
      
      // Keywords that indicate calculation/transformation
      const calculationKeywords = [
        'calculate',
        'compute',
        'transform',
        'convert',
        'interpolate',
        'lerp',
        'normalize',
        'clamp',
        'map',
        'get' // Getters that compute values
      ];

      return calculationKeywords.some(keyword => methodName.toLowerCase().includes(keyword));
    }

    function hasNonDeterministicCalls(node) {
      // Check if method uses Date.now(), Math.random(), performance.now(), etc.
      let hasNonDeterministic = false;
      const visited = new WeakSet(); // Prevent infinite recursion

      function traverse(astNode) {
        if (!astNode || typeof astNode !== 'object') return;
        
        // Prevent circular references
        if (visited.has(astNode)) return;
        visited.add(astNode);

        // Check for Math.random()
        if (astNode.type === 'MemberExpression' &&
            astNode.object?.name === 'Math' &&
            astNode.property?.name === 'random') {
          hasNonDeterministic = true;
        }

        // Check for Date.now()
        if (astNode.type === 'MemberExpression' &&
            astNode.object?.name === 'Date' &&
            astNode.property?.name === 'now') {
          hasNonDeterministic = true;
        }

        // Check for performance.now()
        if (astNode.type === 'MemberExpression' &&
            astNode.object?.name === 'performance' &&
            astNode.property?.name === 'now') {
          hasNonDeterministic = true;
        }

        // Recursively check child nodes (skip parent/loc/range to avoid cycles)
        for (const key in astNode) {
          if (key === 'parent' || key === 'loc' || key === 'range') continue;
          
          if (astNode[key] && typeof astNode[key] === 'object') {
            if (Array.isArray(astNode[key])) {
              astNode[key].forEach(child => traverse(child));
            } else {
              traverse(astNode[key]);
            }
          }
        }
      }

      if (node.value?.body) {
        traverse(node.value.body);
      }

      return hasNonDeterministic;
    }

    function hasCacheExemption(node) {
      const comments = context.getSourceCode().getCommentsBefore(node);
      return comments.some(comment => {
        const text = comment.value.toLowerCase();
        return text.includes('no-cache') ||
               text.includes('no @cache') ||
               text.includes('non-deterministic') ||
               text.includes('always fresh');
      });
    }

    return {
      MethodDefinition(node) {
        // Skip TypeScript overload declarations
        if (!node.value?.body) {
          return;
        }

        // Skip private methods
        if (node.accessibility === 'private' || node.accessibility === 'protected') {
          return;
        }

        const methodName = node.key?.name || 'unknown';
        const serviceName = getServiceName(node);

        // Skip if already has cache decorator
        if (hasDecorator(node, 'cache', 'memoize')) {
          return;
        }

        // Skip if has explicit exemption
        if (hasCacheExemption(node)) {
          return;
        }

        // Skip non-deterministic methods
        if (hasNonDeterministicCalls(node)) {
          return;
        }

        // Check if it's a pure calculation method
        if (isPureCalculationMethod(node)) {
          // Critical services get warnings, others get suggestions
          if (isCriticalService) {
            context.report({
              node,
              messageId: 'frequentCalculation',
              data: { methodName, serviceName }
            });
          } else {
            context.report({
              node,
              messageId: 'suggestCache',
              data: { methodName }
            });
          }
        }
      }
    };
  }
};
