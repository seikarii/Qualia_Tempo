/**
 * QUALIA.CODE v1.2 - JsGlslParserService
 * JavaScript-based GLSL parser implementation using @shaderfrog/glsl-parser.
 * This is the TACTICAL SOLUTION as defined in CRISALIDA.CODE v1.1.
 * 
 * ARCHITECTURE NOTE: This service implements IGlslParser interface, enabling
 * zero-impact replacement with a Wasm-based parser in the future.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { 
  IGlslParser, 
  GlslAst, 
  GlslAstNode, 
  UniformDeclaration 
} from './interfaces/IGlslParser';
import type { ILogger } from './interfaces/ILogger';
import { parser } from '@shaderfrog/glsl-parser';
import { logMethod, catchError } from '../utils/decorators';

@injectable()
export class JsGlslParserService implements IGlslParser {
  private readonly logger: ILogger;

  constructor(
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.logger = logger;
  }

  @logMethod
  @catchError
  public async parse(source: string): Promise<GlslAst> {
    this.logger.debug('Parsing GLSL source with @shaderfrog/glsl-parser');

    try {
      // Parse using @shaderfrog/glsl-parser
      const ast = parser.parse(source);
      
      this.logger.debug('GLSL source parsed successfully', {
        nodeCount: ast.program?.length || 0
      });

      // Type-safe conversion
      return ast as unknown as GlslAst;
    } catch (error) {
      this.logger.error('GLSL parsing failed', { error });
      throw new Error(`GLSL parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  @logMethod
  public extractUniforms(ast: GlslAst): UniformDeclaration[] {
    const uniforms: UniformDeclaration[] = [];

    // Traverse the AST to find uniform declarations
    this.traverseAst(ast.program, (_node: GlslAstNode) => {
      const extracted = this.extractUniformFromNode(_node);
      if (extracted) {
        uniforms.push(...extracted);
      }
    });

    this.logger.debug(`Extracted ${uniforms.length} uniform declarations from AST`);
    return uniforms;
  }

  /**
   * Extracts uniform declarations from a single AST node.
   * Separated for complexity reduction and testability.
   */
  private extractUniformFromNode(node: GlslAstNode): UniformDeclaration[] | null {
    if (!this.isUniformDeclaration(node)) {
      return null;
    }

    const typeNode = node.specified_type?.specifier;
    const typeName = typeNode?.token ?? typeNode?.type ?? 'unknown';

    return this.extractDeclarators(node, typeName);
  }

  /**
   * Checks if a node is a uniform declaration.
   */
  private isUniformDeclaration(node: GlslAstNode): boolean {
    if (node.type !== 'declaration' || !node.specified_type) {
      return false;
    }

    return node.specified_type.qualifiers?.some(
      (q) => q.token === 'uniform' || q.type === 'uniform'
    ) ?? false;
  }

  /**
   * Extracts variable names from declarators.
   */
  private extractDeclarators(node: GlslAstNode, typeName: string): UniformDeclaration[] | null {
    const uniforms: UniformDeclaration[] = [];
    
    if (node.declarators && Array.isArray(node.declarators)) {
      for (const declarator of node.declarators) {
        const name = declarator.identifier?.identifier ?? declarator.name?.identifier;
        if (name) {
          uniforms.push({
            name,
            type: typeName,
            qualifier: 'uniform'
          });
        }
      }
    }

    return uniforms.length > 0 ? uniforms : null;
  }

  /**
   * Recursively traverses the AST and applies a visitor function to each node.
   * Complexity reduced by extracting child traversal logic.
   */
  private traverseAst(nodes: GlslAstNode[] | GlslAstNode, visitor: (_node: GlslAstNode) => void): void {
    if (!nodes) return;

    const nodeArray = Array.isArray(nodes) ? nodes : [nodes];

    for (const node of nodeArray) {
      if (!node || typeof node !== 'object') continue;

      visitor(node);
      this.traverseChildren(node, visitor);
    }
  }

  /**
   * Traverses child nodes of a given AST node.
   * Separated for complexity reduction.
   */
  private traverseChildren(_node: GlslAstNode, visitor: (_node: GlslAstNode) => void): void {
    for (const key of Object.keys(_node)) {
      const value = _node[key];
      if (!value || typeof value !== 'object') continue;

      if (Array.isArray(value)) {
        this.traverseAst(value, visitor);
      } else if (this.isAstNode(value)) {
        this.traverseAst(value as GlslAstNode, visitor);
      }
    }
  }

  /**
   * Type guard to check if a value is an AST node.
   */
  private isAstNode(value: unknown): value is GlslAstNode {
    return typeof value === 'object' && value !== null && 'type' in value;
  }
}
