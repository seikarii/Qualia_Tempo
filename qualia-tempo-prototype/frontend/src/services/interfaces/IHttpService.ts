export interface HttpRequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  timeout?: number; // Timeout in milliseconds - QUALIA.CODE v1.1 Platform Abstraction
}

export interface IHttpService {
  get<T>(url: string, options?: HttpRequestOptions): Promise<T>;
  post<T>(url: string, options?: HttpRequestOptions): Promise<T>;
  put<T>(url: string, options?: HttpRequestOptions): Promise<T>;
  delete<T>(url: string, options?: HttpRequestOptions): Promise<T>;
}
