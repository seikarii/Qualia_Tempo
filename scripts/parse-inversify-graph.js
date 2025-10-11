#!/usr/bin/env node
/**
 * @fileoverview Dependency Graph Parser for InversifyJS Configuration
 * @author Qualia Tempo Team
 * 
 * PURPOSE: Parse inversify.config.ts to generate dependency-graph.json
 * This enables global intelligence for ESLint rules that need to understand
 * the complete IoC container structure.
 * 
 * OUTPUT: dependency-graph.json with structure:
 * {
 *   "bindings": { "TYPES.IService": { "implementation": "ServiceClass", "scope": "singleton", ... } },
 *   "dependencies": { "ServiceClass": ["ILogger", "IEventBus", ...] },
 *   "cycles": [ ["ServiceA", "ServiceB", "ServiceA"] ]
 * }
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

class InversifyGraphParser {
  constructor(configFilePath) {
    this.configFilePath = configFilePath;
    this.bindings = {};
    this.dependencies = {};
    this.cycles = [];
    this.serviceFiles = new Map(); // Service name -> file path
  }

  parse() {
    const sourceText = fs.readFileSync(this.configFilePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      this.configFilePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );

    this.visit(sourceFile);
    this.detectCycles();
    
    return {
      bindings: this.bindings,
      dependencies: this.dependencies,
      cycles: this.cycles,
      serviceFiles: Object.fromEntries(this.serviceFiles)
    };
  }

  visit(node) {
    if (ts.isCallExpression(node)) {
      this.analyzeBinding(node);
    }

    if (ts.isImportDeclaration(node)) {
      this.analyzeImport(node);
    }

    ts.forEachChild(node, child => this.visit(child));
  }

  analyzeImport(node) {
    // Extract service class imports and their file paths
    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return;

    const importPath = moduleSpecifier.text;
    const importClause = node.importClause;
    
    if (!importClause) return;

    // Handle named imports: import { ServiceClass } from './ServiceClass'
    if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
      importClause.namedBindings.elements.forEach(element => {
        const serviceName = element.name.text;
        if (!serviceName.startsWith('I') && !serviceName.includes('Config') && !serviceName.includes('Params')) {
          this.serviceFiles.set(serviceName, importPath);
        }
      });
    }
  }

  analyzeBinding(node) {
    // Match pattern: container.bind<IService>(TYPES.IService).to(ServiceClass).inSingletonScope()
    const callChain = this.extractCallChain(node);
    
    if (callChain.length === 0) return;

    // Check if first call is container.bind()
    const firstCall = callChain[0];
    if (!this.isContainerBind(firstCall)) return;

    // Extract binding information
    const binding = {
      interface: null,
      implementation: null,
      scope: 'transient', // default
      typeSymbol: null,
      file: null
    };

    // Extract type argument from bind<IService>()
    if (firstCall.typeArguments && firstCall.typeArguments.length > 0) {
      binding.interface = firstCall.typeArguments[0].getText();
    }

    // Extract TYPES.IService from bind(TYPES.IService)
    if (firstCall.arguments && firstCall.arguments.length > 0) {
      const arg = firstCall.arguments[0];
      binding.typeSymbol = arg.getText();
    }

    // Analyze chained calls
    callChain.forEach(call => {
      const methodName = this.getMethodName(call);
      
      if (methodName === 'to') {
        // Extract ServiceClass from .to(ServiceClass)
        if (call.arguments && call.arguments.length > 0) {
          binding.implementation = call.arguments[0].getText();
          binding.file = this.serviceFiles.get(binding.implementation) || null;
        }
      } else if (methodName === 'toSelf') {
        binding.implementation = binding.interface;
      } else if (methodName === 'toService') {
        // .toService(TYPES.IOtherService) - alias binding
        if (call.arguments && call.arguments.length > 0) {
          binding.implementation = `@alias:${call.arguments[0].getText()}`;
        }
      } else if (methodName === 'inSingletonScope') {
        binding.scope = 'singleton';
      } else if (methodName === 'inTransientScope') {
        binding.scope = 'transient';
      } else if (methodName === 'inRequestScope') {
        binding.scope = 'request';
      }
    });

    if (binding.typeSymbol && binding.implementation) {
      this.bindings[binding.typeSymbol] = binding;

      // Now parse the service file to extract its constructor dependencies
      if (binding.file && !binding.implementation.startsWith('@alias:')) {
        this.extractDependencies(binding.implementation, binding.file);
      }
    }
  }

  extractDependencies(serviceName, serviceFilePath) {
    // Resolve absolute path
    const configDir = path.dirname(this.configFilePath);
    const absolutePath = path.resolve(configDir, serviceFilePath + '.ts');

    if (!fs.existsSync(absolutePath)) {
      console.warn(`[WARN] Service file not found: ${absolutePath}`);
      return;
    }

    const sourceText = fs.readFileSync(absolutePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      absolutePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );

    const dependencies = [];

    const visit = (node) => {
      // Find class declaration
      if (ts.isClassDeclaration(node) && node.name && node.name.text === serviceName) {
        // Find constructor
        node.members.forEach(member => {
          if (ts.isConstructorDeclaration(member)) {
            member.parameters.forEach(param => {
              // Extract @inject(TYPES.IService) decorators using modifiers (TypeScript 5+)
              const decorators = ts.canHaveDecorators(param) ? ts.getDecorators(param) : param.decorators;
              
              if (decorators) {
                decorators.forEach(decorator => {
                  const expr = decorator.expression;
                  if (ts.isCallExpression(expr)) {
                    const decoratorName = expr.expression.getText();
                    if (decoratorName === 'inject') {
                      const typeArg = expr.arguments[0];
                      if (typeArg) {
                        dependencies.push(typeArg.getText());
                      }
                    }
                  }
                });
              }
            });
          }
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    if (dependencies.length > 0) {
      this.dependencies[serviceName] = dependencies;
    }
  }

  detectCycles() {
    // Tarjan's algorithm for cycle detection in dependency graph
    const visited = new Set();
    const recStack = new Set();
    const cycles = [];

    const dfs = (service, path = []) => {
      visited.add(service);
      recStack.add(service);
      path.push(service);

      const deps = this.dependencies[service] || [];
      
      for (const depSymbol of deps) {
        // Resolve symbol to actual service name
        const depBinding = this.bindings[depSymbol];
        if (!depBinding) continue;

        const depService = depBinding.implementation;
        if (depService.startsWith('@alias:')) continue;

        if (!visited.has(depService)) {
          dfs(depService, [...path]);
        } else if (recStack.has(depService)) {
          // Cycle detected
          const cycleStart = path.indexOf(depService);
          if (cycleStart !== -1) {
            cycles.push([...path.slice(cycleStart), depService]);
          }
        }
      }

      recStack.delete(service);
    };

    for (const service of Object.keys(this.dependencies)) {
      if (!visited.has(service)) {
        dfs(service);
      }
    }

    this.cycles = cycles;
  }

  extractCallChain(node) {
    const chain = [];
    let current = node;

    while (ts.isCallExpression(current)) {
      chain.push(current);
      current = current.expression;
      
      if (ts.isPropertyAccessExpression(current)) {
        current = current.expression;
      } else {
        break;
      }
    }

    return chain.reverse();
  }

  isContainerBind(callNode) {
    const expr = callNode.expression;
    if (!ts.isPropertyAccessExpression(expr)) return false;
    
    const method = expr.name.text;
    const object = expr.expression.getText();
    
    return method === 'bind' && object === 'container';
  }

  getMethodName(callNode) {
    const expr = callNode.expression;
    if (ts.isPropertyAccessExpression(expr)) {
      return expr.name.text;
    }
    return null;
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const configPath = args[0] || path.join(__dirname, '../qualia-tempo-prototype/frontend/src/services/inversify.config.ts');
  const outputPath = args[1] || path.join(__dirname, '../eslint-plugin-qualia-code/dependency-graph.json');

  console.log(`[INFO] Parsing InversifyJS configuration: ${configPath}`);
  
  const parser = new InversifyGraphParser(configPath);
  const graph = parser.parse();

  // Write output
  fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));

  console.log(`[SUCCESS] Dependency graph written to: ${outputPath}`);
  console.log(`[INFO] Bindings: ${Object.keys(graph.bindings).length}`);
  console.log(`[INFO] Services: ${Object.keys(graph.dependencies).length}`);
  console.log(`[INFO] Cycles detected: ${graph.cycles.length}`);

  if (graph.cycles.length > 0) {
    console.log('\n[WARN] Circular dependencies detected:');
    graph.cycles.forEach((cycle, i) => {
      console.log(`  ${i + 1}. ${cycle.join(' → ')}`);
    });
    process.exit(1);
  }

  process.exit(0);
}

module.exports = { InversifyGraphParser };
