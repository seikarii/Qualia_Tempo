export interface IShaderLoaderService {
  load(shaderName: string): Promise<string>;
}