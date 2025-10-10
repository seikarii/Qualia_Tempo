/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-mutex-on-state-mutations
 * 
 * QUALIA.CODE §ANALISIS.md §4.3 - Methods that mutate shared state (Zustand store, EventBus)
 * MUST use @mutex decorator to prevent race conditions.
 * 
 * RATIONALE:
 * - Concurrent state updates can cause data races
 * - EventBus can receive multiple events simultaneously
 * - Store mutations must be atomic
 * 
 * DETECTS:
 * - Methods calling store.setState() or store.getState().set*()
 * - Methods in GameStateStoreService
 * - Methods modifying shared mutable objects
 * 
 * EXCEPTIONS:
 * - Methods already using @mutex
 * - Read-only getters
 * - Methods marked as thread-safe with comment
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce @mutex decorator on methods that mutate shared state',
      category: 'QUALIA.CODE Compliance',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/ANALISIS.md#43-game-pipeline'
    },
    fixable: null,
    schema: [],
    messages: {
      missingMutex: 'Method "{{methodName}}" mutates shared state but lacks @mutex decorator. Race conditions possible. (QUALIA.CODE Concurrency)',
      storeUpdateWithoutMutex: 'GameStateStore update in "{{methodName}}" needs @mutex to prevent concurrent mutations.',
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

    // Focus on state management services
    const isGameStateStoreService = filename.includes('GameStateStoreService');

    function hasDecorator(node, decoratorName) {
      if (!node.decorators || !Array.isArray(node.decorators)) {
        return false;
      }

      return node.decorators.some(decorator => {
        const name = decorator.expression?.name || decorator.expression?.callee?.name;
        return name === decoratorName;
      });
    }

    function hasThreadSafeComment(node) {
      const comments = context.getSourceCode().getCommentsBefore(node);
      return comments.some(comment => {
        const text = comment.value.toLowerCase();
        return text.includes('thread-safe') ||
               text.includes('no-mutex') ||
               text.includes('atomic') ||
               text.includes('lock-free');
      });
    }

    function mutatesSharedState(node) {
      let mutatesState = false;
      const visited = new WeakSet();
      
      function traverse(astNode) {
        if (!astNode || typeof astNode !== 'object') return;
        if (visited.has(astNode)) return;
        visited.add(astNode);

        // Check for store.setState()
        if (astNode.type === 'CallExpression' &&
            astNode.callee?.type === 'MemberExpression' &&
            astNode.callee.property?.name === 'setState') {
          mutatesState = true;
        }

        // Check for useGameStore.getState().setProperty()
        if (astNode.type === 'CallExpression' &&
            astNode.callee?.type === 'MemberExpression' &&
            astNode.callee.property?.name?.startsWith('set')) {
          // Check if it's chained from getState()
          const obj = astNode.callee.object;
          if (obj?.type === 'CallExpression' &&
              obj.callee?.property?.name === 'getState') {
            mutatesState = true;
          }
        }

        // Check for this.store.setState or this.gameStore.set*
        if (astNode.type === 'CallExpression' &&
            astNode.callee?.type === 'MemberExpression') {
          const objName = astNode.callee.object?.property?.name || '';
          const methodName = astNode.callee.property?.name || '';
          
          if ((objName.includes('store') || objName.includes('Store')) &&
              (methodName === 'setState' || methodName.startsWith('set'))) {
            mutatesState = true;
          }
        }

        // Recursively check child nodes
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

      return mutatesState;
    }

    return {
      MethodDefinition(node) {
        // Skip TypeScript overload declarations
        if (!node.value?.body) {
          return;
        }

        // Skip private methods (internal state is less critical)
        if (node.accessibility === 'private') {
          return;
        }

        const methodName = node.key?.name || 'unknown';

        // Skip if already has mutex
        if (hasDecorator(node, 'mutex') || hasDecorator(node, 'lock')) {
          return;
        }

        // Skip if explicitly marked as thread-safe
        if (hasThreadSafeComment(node)) {
          return;
        }

        // Check if method mutates shared state
        if (mutatesSharedState(node)) {
          if (isGameStateStoreService) {
            context.report({
              node,
              messageId: 'storeUpdateWithoutMutex',
              data: { methodName }
            });
          } else {
            context.report({
              node,
              messageId: 'missingMutex',
              data: { methodName }
            });
          }
        }
      }
    };
  }
};
