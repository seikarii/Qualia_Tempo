#!/usr/bin/env node

/**
 * QUALIA.CODE v1.1 - Circular Dependency Detection Script
 * 
 * PURPOSE: Detect circular dependencies and binding order violations in InversifyJS IoC container
 * 
 * CONTEXT: InversifyJS resolves dependencies lazily. When a Params binding calls container.get<IService>(),
 * it triggers immediate service instantiation, which looks for that service's Params. If those Params haven't
 * been bound yet, the container throws "No bindings found," causing cascading failures.
 * 
 * USAGE:
 *   pnpm run detect-circular-deps
 *   npm run detect-circular-deps
 * 
 * EXIT CODES:
 *   0 - No violations found
 *   1 - Violations detected
 *   2 - Script error (file not found, parse error, etc.)
 * 
 * INTEGRATION:
 *   - Standalone: pnpm run detect-circular-deps
 *   - Lint Architecture: ./scripts/lint-architecture.sh (includes this script)
 *   - CI/CD: Add to build pipeline as a blocking check
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface BindingNode {
  symbol: string;              // TYPES.ServiceParams
  lineNumber: number;          // Line where safeBindConstant() is called
  dependencies: string[];      // Other services retrieved via container.get()
  functionName?: string;       // Function where binding occurs (e.g., bindLevel2ServiceParams)
}

interface Violation {
  type: 'BINDING_ORDER' | 'MISSING_BINDING' | 'CYCLE';
  service: string;
  dependency?: string;
  serviceLine?: number;
  dependencyLine?: number;
  message: string;
  path?: string[];  // For cycle violations
}

interface AnalysisResult {
  bindings: BindingNode[];
  violations: Violation[];
  hasCycles: boolean;
}

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG_FILE_PATH = path.resolve(
  __dirname,
  '../qualia-tempo-prototype/frontend/src/services/inversify.config.ts'
);

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m',
};

/**
 * Infrastructure services that are bound directly (no Params)
 * These are exempt from binding order validation because they don't have Params objects
 */
const INFRASTRUCTURE_SERVICES = new Set([
  'ILogger',
  'IEventBus',
  'ITimerService',
  'IHttpService',
  'IPerformanceService',
  'IGameStateStore',
  'IWebSocketFactory',
  'IOntologicalAudioEngine',
  'IWebAudioAPIService',
  'IShaderLoaderService',
  'IShaderIntrospectionService',
  'IInputStateService',
  'IGameplayMechanicsService',
  'IViewLogicService',
  'ISubtitleService',
  'IAudioSystemBridge',
  'IBrowserEventsService',
  'IGameStateStoreService',  // Special case - doesn't have Params, bound directly
  'ThrottlingManager',  // Utility class, not a service with Params
]);

/**
 * Map service interface name to its Params type
 * e.g., "IAudioService" → "AudioServiceParams"
 */
function serviceToParams(serviceInterface: string): string {
  // Remove leading 'I' if present
  let serviceName = serviceInterface.startsWith('I') 
    ? serviceInterface.slice(1) 
    : serviceInterface;
  
  // Append 'Params' if it doesn't already end with 'Service'
  if (serviceName.endsWith('Service')) {
    return serviceName + 'Params';
  } else if (serviceName.endsWith('Controller')) {
    return serviceName + 'Params';
  }
  
  return serviceName + 'Params';
}

// ==========================================
// AST PARSING UTILITIES
// ==========================================

/**
 * Extract TYPES symbol from MemberExpression (e.g., TYPES.ILogger → "ILogger")
 */
function extractTypeSymbol(node: TSESTree.Node | null | undefined): string | null {
  if (!node) return null;
  
  if (node.type === 'MemberExpression') {
    const object = node.object;
    const property = node.property;
    
    // Check if it's TYPES.Something
    if (
      object.type === 'Identifier' &&
      object.name === 'TYPES' &&
      property.type === 'Identifier'
    ) {
      return property.name;
    }
  }
  
  return null;
}

/**
 * Extract all container.get() calls from an AST node
 */
function extractContainerGetCalls(node: TSESTree.Node): string[] {
  const dependencies: string[] = [];
  
  function visit(n: TSESTree.Node) {
    // Look for container.get<IService>(TYPES.Service)
    if (
      n.type === 'CallExpression' &&
      n.callee.type === 'MemberExpression' &&
      n.callee.object.type === 'Identifier' &&
      n.callee.object.name === 'container' &&
      n.callee.property.type === 'Identifier' &&
      n.callee.property.name === 'get'
    ) {
      // Extract TYPES.Symbol from arguments
      const firstArg = n.arguments[0];
      const symbol = extractTypeSymbol(firstArg);
      if (symbol) {
        dependencies.push(symbol);
      }
    }
    
    // Recursively visit child nodes
    for (const key in n) {
      const value = (n as any)[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item && typeof item.type === 'string') {
              visit(item);
            }
          });
        } else if (typeof value.type === 'string') {
          visit(value);
        }
      }
    }
  }
  
  visit(node);
  return dependencies;
}

/**
 * Extract all safeBindConstant() calls from AST
 */
function extractBindings(ast: TSESTree.Program): BindingNode[] {
  const bindings: BindingNode[] = [];
  let currentFunctionName: string | undefined;
  
  function visit(node: TSESTree.Node) {
    // Track function context
    if (
      node.type === 'FunctionDeclaration' &&
      node.id &&
      node.id.type === 'Identifier'
    ) {
      currentFunctionName = node.id.name;
    }
    
    // Look for safeBindConstant<ServiceParams>(TYPES.ServiceParams, {...})
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'safeBindConstant'
    ) {
      // First argument: TYPES.ServiceParams
      const firstArg = node.arguments[0];
      const symbol = extractTypeSymbol(firstArg);
      
      if (symbol && node.loc) {
        // Second argument: object with container.get() calls
        const secondArg = node.arguments[1];
        const dependencies = secondArg ? extractContainerGetCalls(secondArg) : [];
        
        bindings.push({
          symbol,
          lineNumber: node.loc.start.line,
          dependencies,
          functionName: currentFunctionName,
        });
      }
    }
    
    // Recursively visit child nodes
    for (const key in node) {
      const value = (node as any)[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item && typeof item.type === 'string') {
              visit(item);
            }
          });
        } else if (typeof value.type === 'string') {
          visit(value);
        }
      }
    }
  }
  
  visit(ast);
  return bindings;
}

// ==========================================
// CYCLE DETECTION (DFS)
// ==========================================

/**
 * Detect cycles in dependency graph using Depth-First Search
 */
function detectCycles(bindings: BindingNode[]): Violation[] {
  const violations: Violation[] = [];
  const adjList = new Map<string, string[]>();
  
  // Build adjacency list
  bindings.forEach((binding) => {
    adjList.set(binding.symbol, binding.dependencies);
  });
  
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];
  
  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);
    
    const neighbors = adjList.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Cycle detected
        const cycleStart = path.indexOf(neighbor);
        const cyclePath = path.slice(cycleStart).concat(neighbor);
        
        violations.push({
          type: 'CYCLE',
          service: node,
          dependency: neighbor,
          message: `Circular dependency detected: ${cyclePath.join(' → ')}`,
          path: cyclePath,
        });
        
        return true;
      }
    }
    
    path.pop();
    recursionStack.delete(node);
    return false;
  }
  
  // Check all nodes
  for (const binding of bindings) {
    if (!visited.has(binding.symbol)) {
      dfs(binding.symbol);
    }
  }
  
  return violations;
}

// ==========================================
// BINDING ORDER VALIDATION
// ==========================================

/**
 * Validate that dependencies are bound before dependents
 */
function validateBindingOrder(bindings: BindingNode[]): Violation[] {
  const violations: Violation[] = [];
  const bindingMap = new Map<string, number>();
  
  // Build map of symbol → line number
  bindings.forEach((binding) => {
    bindingMap.set(binding.symbol, binding.lineNumber);
  });
  
  // Check each binding's dependencies
  bindings.forEach((binding) => {
    binding.dependencies.forEach((dep) => {
      // Skip infrastructure services - they're bound directly without Params
      if (INFRASTRUCTURE_SERVICES.has(dep)) {
        return;  // This is expected, not a violation
      }
      
      // Map service interface to its Params type
      // e.g., IAudioService → AudioServiceParams
      const depParams = serviceToParams(dep);
      const depLineNumber = bindingMap.get(depParams);
      
      if (!depLineNumber) {
        // Dependency Params never bound (and it's not an infrastructure service)
        violations.push({
          type: 'MISSING_BINDING',
          service: binding.symbol,
          dependency: depParams,
          serviceLine: binding.lineNumber,
          message: `${binding.symbol} (line ${binding.lineNumber}) retrieves ${dep}, which needs ${depParams}, but ${depParams} is never bound`,
        });
      } else if (depLineNumber > binding.lineNumber) {
        // Dependency Params bound AFTER dependent
        violations.push({
          type: 'BINDING_ORDER',
          service: binding.symbol,
          dependency: depParams,
          serviceLine: binding.lineNumber,
          dependencyLine: depLineNumber,
          message: `${binding.symbol} (line ${binding.lineNumber}) retrieves ${dep}, which needs ${depParams} (line ${depLineNumber}), but ${depParams} is bound AFTER. Move ${depParams} binding BEFORE line ${binding.lineNumber}`,
        });
      }
    });
  });
  
  return violations;
}

// ==========================================
// ANALYSIS ORCHESTRATION
// ==========================================

/**
 * Main analysis function
 */
function analyzeCircularDependencies(filePath: string): AnalysisResult {
  // Read and parse file
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const ast = parse(fileContent, {
    loc: true,
    range: true,
    comment: true,
  });
  
  // Extract bindings
  const bindings = extractBindings(ast);
  
  // Detect cycles
  const cycleViolations = detectCycles(bindings);
  
  // Validate binding order
  const orderViolations = validateBindingOrder(bindings);
  
  const allViolations = [...cycleViolations, ...orderViolations];
  
  return {
    bindings,
    violations: allViolations,
    hasCycles: cycleViolations.length > 0,
  };
}

// ==========================================
// REPORTING
// ==========================================

/**
 * Print violations with colors and formatting
 */
function printReport(result: AnalysisResult): void {
  console.log(`\n${COLORS.CYAN}🔍 IoC Circular Dependency Analysis${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}=====================================${COLORS.RESET}\n`);
  
  console.log(`📊 ${COLORS.BLUE}Statistics:${COLORS.RESET}`);
  console.log(`   - Bindings analyzed: ${result.bindings.length}`);
  console.log(`   - Violations found: ${result.violations.length}`);
  console.log(`   - Cycles detected: ${result.violations.filter((v) => v.type === 'CYCLE').length}`);
  console.log(`   - Binding order issues: ${result.violations.filter((v) => v.type === 'BINDING_ORDER').length}`);
  console.log(`   - Missing bindings: ${result.violations.filter((v) => v.type === 'MISSING_BINDING').length}\n`);
  
  if (result.violations.length === 0) {
    console.log(`${COLORS.GREEN}✅ No violations detected!${COLORS.RESET}\n`);
    console.log(`${COLORS.GREEN}✅ Dependency graph is acyclic${COLORS.RESET}`);
    console.log(`${COLORS.GREEN}✅ All dependencies are bound before dependents${COLORS.RESET}\n`);
    return;
  }
  
  // Print violations by type
  const cycleViolations = result.violations.filter((v) => v.type === 'CYCLE');
  const orderViolations = result.violations.filter((v) => v.type === 'BINDING_ORDER');
  const missingViolations = result.violations.filter((v) => v.type === 'MISSING_BINDING');
  
  if (cycleViolations.length > 0) {
    console.log(`${COLORS.RED}❌ CIRCULAR DEPENDENCIES DETECTED:${COLORS.RESET}\n`);
    cycleViolations.forEach((violation, index) => {
      console.log(`   ${index + 1}. ${violation.message}`);
      console.log(`      ${COLORS.YELLOW}Solution: Break the cycle by refactoring dependencies${COLORS.RESET}\n`);
    });
  }
  
  if (orderViolations.length > 0) {
    console.log(`${COLORS.RED}❌ BINDING ORDER VIOLATIONS:${COLORS.RESET}\n`);
    orderViolations.forEach((violation, index) => {
      console.log(`   ${index + 1}. ${violation.message}`);
      console.log(`      ${COLORS.YELLOW}Solution: Move ${violation.dependency}Params binding BEFORE line ${violation.serviceLine}${COLORS.RESET}\n`);
    });
  }
  
  if (missingViolations.length > 0) {
    console.log(`${COLORS.RED}❌ MISSING BINDINGS:${COLORS.RESET}\n`);
    missingViolations.forEach((violation, index) => {
      console.log(`   ${index + 1}. ${violation.message}`);
      console.log(`      ${COLORS.YELLOW}Solution: Add binding for ${violation.dependency}Params${COLORS.RESET}\n`);
    });
  }
  
  console.log(`${COLORS.RED}💥 Found ${result.violations.length} violation(s)${COLORS.RESET}\n`);
}

// ==========================================
// MAIN EXECUTION
// ==========================================

function main(): void {
  try {
    console.log(`${COLORS.CYAN}�� Starting IoC Circular Dependency Detection...${COLORS.RESET}\n`);
    
    // Check if file exists
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      console.error(`${COLORS.RED}❌ Error: File not found: ${CONFIG_FILE_PATH}${COLORS.RESET}`);
      process.exit(2);
    }
    
    console.log(`📁 Analyzing: ${CONFIG_FILE_PATH}\n`);
    
    // Run analysis
    const result = analyzeCircularDependencies(CONFIG_FILE_PATH);
    
    // Print report
    printReport(result);
    
    // Exit with appropriate code
    if (result.violations.length > 0) {
      process.exit(1);  // Violations found
    } else {
      process.exit(0);  // All good
    }
  } catch (error) {
    console.error(`${COLORS.RED}❌ Script error:${COLORS.RESET}`, error);
    process.exit(2);
  }
}

// Execute
main();
