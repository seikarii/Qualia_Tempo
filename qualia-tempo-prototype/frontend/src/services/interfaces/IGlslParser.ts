/**
 * QUALIA.CODE v1.2 - IGlslParser Interface
 * Abstract interface for GLSL parsing services.
 * Enables swapping between JS and Wasm implementations without affecting dependents.
 */

/**
 * Represents a GLSL AST node.
 * This is a simplified representation compatible with @shaderfrog/glsl-parser output.
 */
export interface GlslAstNode {
  type: string;
  specified_type?: {
    qualifiers?: Array<{ token?: string; type?: string }>;
    specifier?: { token?: string; type?: string };
  };
  declarators?: Array<{
    identifier?: { identifier?: string };
    name?: { identifier?: string };
  }>;
  [key: string]: unknown;
}

/**
 * Represents a complete GLSL program AST.
 */
export interface GlslAst {
  type: 'program';
  program: GlslAstNode[];
  scopes?: unknown[];
}

/**
 * Uniform declaration extracted from AST.
 */
export interface UniformDeclaration {
  name: string;
  type: string;
  qualifier?: string;
}

/**
 * Abstract interface for GLSL parsing.
 * Implementations can be JS-based (tactical) or Wasm-based (strategic).
 */
export interface IGlslParser {
  /**
   * Parses GLSL source code into an Abstract Syntax Tree.
   * @param source - The GLSL source code to parse.
   * @returns A promise that resolves to the parsed AST.
   * @throws Error if parsing fails.
   */
  parse(source: string): Promise<GlslAst>;

  /**
   * Extracts uniform declarations from a GLSL AST.
   * @param ast - The parsed GLSL AST.
   * @returns Array of uniform declarations found in the AST.
   */
  extractUniforms(ast: GlslAst): UniformDeclaration[];
}
