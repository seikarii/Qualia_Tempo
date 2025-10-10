/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-retry-on-io-operations
 * 
 * Enforces @retry decorator on methods performing I/O operations for automatic
 * transient failure handling. This rule makes mandatory what enforce-method-decorators
 * only suggests as advisory.
 * 
 * Rationale (QUALIA.CODE §5.2.1, §6.4):
 * Network operations are inherently unreliable. Transient failures (timeouts, connection drops,
 * server errors 5xx) are common. Manual retry logic is error-prone and inconsistent.
 * The @retry decorator provides centralized, exponential-backoff retry logic.
 * 
 * Detects I/O operations by analyzing method bodies for:
 * - HTTP requests (fetch, HttpService, axios)
 * - WebSocket operations (connect, send, disconnect)
 * - Storage operations (localStorage, sessionStorage)
 * - File I/O (load, save, read, write)
 * - Backend sync operations (BackendSyncService)
 * 
 * @author Qualia Tempo Team
 */

'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Enforce @retry decorator on methods performing I/O operations for automatic transient failure handling',
      category: 'QUALIA.CODE Compliance',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      missingRetry: 'QUALIA.CODE §6.4: Method "{{methodName}}" performs I/O operations ({{operations}}) but lacks @retry decorator. Network operations require automatic retry logic for transient failures.',
      retryExemptionUndocumented: 'Method "{{methodName}}" performs I/O but has no @retry decorator. If retry is intentionally omitted, document with @retry-exempt comment explaining why.',
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    /**
     * Check if node has @retry decorator
     */
    function hasRetryDecorator(node) {
      if (!node.decorators || !Array.isArray(node.decorators)) {
        return false;
      }

      return node.decorators.some(decorator => {
        if (decorator.expression?.type === 'Identifier') {
          return decorator.expression.name === 'retry';
        }
        if (decorator.expression?.type === 'CallExpression') {
          return decorator.expression.callee?.name === 'retry';
        }
        return false;
      });
    }

    /**
     * Check if method has @retry-exempt comment
     */
    function hasRetryExemption(node) {
      const comments = context.getSourceCode().getCommentsBefore(node);
      return comments.some(comment => {
        const text = comment.value.toLowerCase();
        return text.includes('@retry-exempt') ||
               text.includes('retry: exempt') ||
               text.includes('no retry needed') ||
               text.includes('retry intentionally omitted');
      });
    }

    /**
     * Check if node is in a service class
     */
    function isInServiceClass(node) {
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'ClassDeclaration' && parent.id?.name?.endsWith('Service')) {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    }

    /**
     * Check if method is public
     */
    function isPublicMethod(node) {
      // Skip private/protected methods
      if (node.accessibility === 'private' || node.accessibility === 'protected') {
        return false;
      }

      // Skip underscore-prefixed methods (private convention)
      if (node.key?.name?.startsWith('_')) {
        return false;
      }

      // Skip constructors and lifecycle methods
      const exemptMethods = ['constructor', 'initialize', 'start', 'stop', 'shutdown', 'destroy', 'dispose', 'cleanup'];
      if (exemptMethods.includes(node.key?.name)) {
        return false;
      }

      return true;
    }

    /**
     * Check if method is a status/state getter (not I/O operation)
     * These methods query state but don't perform network operations
     */
    function isStatusGetter(methodName) {
      const statusGetterPatterns = [
        /^get.*State$/i,        // getReadyState, getConnectionState
        /^is.*Connected$/i,     // isConnected, isWebSocketConnected
        /^is.*Active$/i,        // isActive, isSessionActive
        /^is.*Ready$/i,         // isReady, isServiceReady
        /^has.*$/i,             // hasConnection, hasActiveSession
        /^get.*Status$/i,       // getStatus, getConnectionStatus
        /^get.*Info$/i,         // getInfo, getConnectionInfo
        /^get.*Count$/i,        // getCount, getActiveCount
      ];
      
      return statusGetterPatterns.some(pattern => pattern.test(methodName));
    }

    /**
     * Extract the last segment from a dot-separated identifier
     * E.g., "this.activeTimeouts" → "activeTimeouts"
     *       "source.gainNode" → "gainNode"
     */
    function getLastSegment(receiver) {
      if (!receiver) return '';
      const parts = receiver.split('.');
      return parts[parts.length - 1];
    }

    /**
     * Check if a receiver object is a known data structure (not I/O)
     */
    function isDataStructureReceiver(receiverText) {
      const lastSegment = getLastSegment(receiverText);
      
      const dataStructurePatterns = [
        /^this\.[a-z]+Map$/i,      // this.someMap
        /^this\.[a-z]+Set$/i,      // this.someSet
        /^this\.[a-z]+Cache$/i,    // this.someCache, this.cache
        /^this\.cache$/i,          // this.cache (explicit)
        /^this\.[a-z]+Queue$/i,    // this.someQueue
        /^this\.[a-z]+Buffer$/i,   // this.someBuffer
        /^this\.timers$/i,         // this.timers (Map in TimerService)
        /^this\.activeTimers$/i,   // this.activeTimers
        /^this\.intervals$/i,      // this.intervals
        /^this\.timeouts$/i,       // this.timeouts
        /^this\.pools?$/i,         // this.pool, this.pools
        /^this\.registry$/i,       // this.registry
        /^this\.entries$/i,        // this.entries
        /^cache$/i,                // bare cache variable
        /^Map$/,                   // bare Map constructor
        /^Set$/,                   // bare Set constructor
        /^Array$/,                 // bare Array
        /^Object$/,                // bare Object
      ];
      
      // Check full receiver text first
      if (dataStructurePatterns.some(pattern => pattern.test(receiverText))) {
        return true;
      }
      
      // Check last segment for common data structure suffixes
      const lastSegmentPatterns = [
        /Map$/i,           // *Map
        /Set$/i,           // *Set
        /Cache$/i,         // *Cache
        /Queue$/i,         // *Queue
        /Buffer$/i,        // *Buffer
        /Timers?$/i,       // *Timer, *Timers
        /Intervals?$/i,    // *Interval, *Intervals
        /Timeouts?$/i,     // *Timeout, *Timeouts
        /Pools?$/i,        // *Pool, *Pools
        /Registry$/i,      // *Registry
        /Entries$/i,       // *Entries
        /Keys$/i,          // *Keys (pressedKeys, activeKeys, etc.)
        /Items$/i,         // *Items
        /Elements$/i,      // *Elements
        /Targets$/i,       // *Targets (render targets, etc.)
        /Sources$/i,       // *Sources (but careful - could be audio/data sources)
        /Notifications$/i, // *Notifications (activeNotifications, etc.)
        /Listeners$/i,     // *Listeners (event listeners collection)
        /Handlers$/i,      // *Handlers (event handlers collection)
        /Callbacks$/i,     // *Callbacks
        /Storage$/i,       // *Storage (but careful - localStorage is I/O)
        /Store$/i,         // *Store
      ];
      
      // Special case: localStorage/sessionStorage are I/O, not data structures
      if (/^(localStorage|sessionStorage)$/i.test(receiverText)) {
        return false;
      }
      
      return lastSegmentPatterns.some(pattern => pattern.test(lastSegment));
    }

    /**
     * Check if a receiver object is a Web Audio API node (not I/O)
     */
    function isAudioNodeReceiver(receiverText) {
      const lastSegment = getLastSegment(receiverText);
      
      const audioNodePatterns = [
        /AudioNode$/,
        /AudioParam$/,
        /AudioContext$/,
        /^this\.[a-z]*[Nn]ode/,      // this.someNode, this.gainNode
        /^this\.[a-z]*[Ss]ource/,     // this.audioSource, this.source
        /^this\.[a-z]*[Dd]estination/, // this.destination
        /^this\.[a-z]*[Gg]ain/,       // this.gainNode
        /^this\.[a-z]*[Pp]anner/,     // this.pannerNode
        /^this\.convolver/i,
        /^this\.analyser/i,
        /^this\.oscillator/i,
        /^this\.audioContext/i,
        /^gainNode$/i,                // local variable gainNode
        /^pannerNode$/i,              // local variable pannerNode
        /^sourceNode$/i,              // local variable sourceNode
        /^[a-z]*Node$/,               // any variable ending with Node
        /^audioSource$/i,             // parameter audioSource
        /^source$/i,                  // generic audio source variable
      ];
      
      // Check full receiver text first
      if (audioNodePatterns.some(pattern => pattern.test(receiverText))) {
        return true;
      }
      
      // Check last segment for audio node patterns
      const lastSegmentPatterns = [
        /Node$/i,         // *Node (gainNode, pannerNode, sourceNode, etc.)
        /Source$/i,       // *Source (audioSource) - but be careful with data sources
        /Destination$/i,  // *Destination
        /Gain$/i,         // *Gain
        /Panner$/i,       // *Panner
        /Context$/i,      // *Context (audioContext)
        /Convolver$/i,    // *Convolver
        /Analyser$/i,     // *Analyser, *Analyzer
        /Analyzer$/i,
        /Oscillator$/i,   // *Oscillator
        /Filter$/i,       // *Filter (audio filter)
        /Delay$/i,        // *Delay (audio delay node)
        /Compressor$/i,   // *Compressor (dynamics compressor)
      ];
      
      // Special case: soundSources is a Map, not an audio node
      if (/soundSources$/i.test(receiverText)) {
        return false;
      }
      
      return lastSegmentPatterns.some(pattern => pattern.test(lastSegment));
    }

    /**
     * Check if context suggests network I/O (not data structures)
     */
    function isNetworkIoContext(methodText, methodName) {
      // If method contains HttpService, axios, fetch, WebSocket - definitely I/O
      const networkIndicators = [
        /HttpService|httpService/,
        /axios/,
        /fetch\(/,
        /WebSocket|websocket|ws\./,
        /socketService|SocketService/,
        /backendSync|BackendSync/,
        /api\.|API\./,
      ];
      
      return networkIndicators.some(pattern => pattern.test(methodText));
    }

    /**
     * Extract receiver from a method call pattern in text
     * E.g., "this.timers.delete(id)" -> "this.timers"
     *       "audio Node.connect(dest)" -> "audioNode"
     *       "this.cache.get(key)" -> "this.cache"
     */
    function extractReceiver(text, methodName) {
      // Match patterns like: receiver.method(
      // Captures: this.property, object.property, simpleIdentifier
      const regex = new RegExp(`([a-zA-Z_$][a-zA-Z0-9_$.]*(?:\\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\\.${methodName}\\(`, 'g');
      const matches = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push(match[1]);
      }
      return matches;
    }

    /**
     * Detect I/O operations in method body
     * Returns: { isIo: boolean, operations: string[] }
     */
    function analyzeIoOperations(node) {
      if (!node.value?.body) {
        return { isIo: false, operations: [] };
      }
      
      const sourceCode = context.getSourceCode();
      const methodText = sourceCode.getText(node.value);
      
      // UNAMBIGUOUS I/O patterns (always flag these)
      const unambiguousIoPatterns = [
        { pattern: /\bfetch\(/, label: 'fetch()' },
        { pattern: /axios\./, label: 'axios' },
        { pattern: /HttpService|httpService/, label: 'HttpService' },
        { pattern: /\.request\(/, label: 'HTTP request' },
        { pattern: /localStorage\./, label: 'localStorage' },
        { pattern: /sessionStorage\./, label: 'sessionStorage' },
        { pattern: /WebSocket|webSocket|websocket/, label: 'WebSocket' },
        { pattern: /BackendSyncService|backendSyncService/, label: 'BackendSyncService' },
        { pattern: /\.sync\(/, label: 'sync()' },
      ];
      
      const detectedOperations = [];
      
      // Check unambiguous patterns
      for (const { pattern, label } of unambiguousIoPatterns) {
        if (pattern.test(methodText)) {
          detectedOperations.push(label);
        }
      }
      
      // AMBIGUOUS patterns - need context analysis
      const ambiguousPatterns = [
        { methodName: 'get', label: 'HTTP GET' },
        { methodName: 'post', label: 'HTTP POST' },
        { methodName: 'put', label: 'HTTP PUT' },
        { methodName: 'delete', label: 'HTTP DELETE' },
        { methodName: 'connect', label: 'connect()' },
        { methodName: 'disconnect', label: 'disconnect()' },
        { methodName: 'send', label: 'send()' },
        { methodName: 'load', label: 'load()' },
        { methodName: 'save', label: 'save()' },
      ];
      
      for (const { methodName, label } of ambiguousPatterns) {
        const pattern = new RegExp(`\\.${methodName}\\(`);
        if (pattern.test(methodText)) {
          // Extract receivers for this method call
          const receivers = extractReceiver(methodText, methodName);
          
          // Check if any receiver is clearly a data structure or audio node
          const hasDataStructureReceiver = receivers.some(r => isDataStructureReceiver(r));
          const hasAudioNodeReceiver = receivers.some(r => isAudioNodeReceiver(r));
          
          // If all receivers are data structures/audio nodes, skip
          if (receivers.length > 0 && (hasDataStructureReceiver || hasAudioNodeReceiver)) {
            // Check if context still suggests network I/O
            if (!isNetworkIoContext(methodText, methodName)) {
              continue; // Skip this false positive
            }
          }
          
          // If we get here, it's likely real I/O
          detectedOperations.push(label);
        }
      }
      
      // Remove duplicates
      const uniqueOperations = [...new Set(detectedOperations)];
      
      return {
        isIo: uniqueOperations.length > 0,
        operations: uniqueOperations
      };
    }

    return {
      MethodDefinition(node) {
        // Only check if we're in a service class
        if (!isInServiceClass(node)) {
          return;
        }

        // Skip TypeScript overload declarations (no body)
        if (!node.value?.body) {
          return;
        }

        // Only check public methods
        if (!isPublicMethod(node)) {
          return;
        }

        // Skip status/state getter methods (they query state, not perform I/O)
        const methodName = node.key?.name;
        if (methodName && isStatusGetter(methodName)) {
          return;
        }

        // Analyze for I/O operations
        const { isIo, operations } = analyzeIoOperations(node);

        if (!isIo) {
          return; // Not an I/O operation, no @retry needed
        }

        const hasRetry = hasRetryDecorator(node);
        const hasExemption = hasRetryExemption(node);

        // If method performs I/O but lacks @retry and has no exemption, report error
        if (!hasRetry && !hasExemption) {
          context.report({
            node,
            messageId: 'missingRetry',
            data: {
              methodName: node.key.name,
              operations: operations.join(', ')
            }
          });
        }

        // If method has exemption but no @retry, this is acceptable (documented decision)
        // No report needed
      }
    };
  }
};
