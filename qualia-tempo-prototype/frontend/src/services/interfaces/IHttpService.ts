export interface HttpRequestOptions {
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
}

export interface IHttpService {
  get<T>(url: string, options?: HttpRequestOptions): Promise<T>;
  post<T>(url: string, options?: HttpRequestOptions): Promise<T>;
  put<T>(url: string, options?: HttpRequestOptions): Promise<T>;
  delete<T>(url: string, options?: HttpRequestOptions): Promise<T>;
}