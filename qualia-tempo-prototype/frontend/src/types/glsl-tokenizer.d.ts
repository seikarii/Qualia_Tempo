declare module 'glsl-tokenizer' {
  interface Token {
    type: string;
    data: string;
    position: number;
    line: number;
    column: number;
  }

  function tokenizer(source: string): Token[];
  export = tokenizer;
}