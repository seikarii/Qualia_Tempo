import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import { logMethod, catchError } from '../utils/decorators';
import type { ILogger } from './interfaces/ILogger';
import type { IHttpService, HttpRequestOptions } from './interfaces/IHttpService';

@injectable()
export class HttpService implements IHttpService {
  private readonly logger: ILogger;

  constructor(
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.logger = logger;
    this.logger.info('HttpService initialized with fetch abstraction');
  }

  @logMethod()
  @catchError()
  public async get<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('GET', url, options);
  }

  @logMethod()
  @catchError()
  public async post<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('POST', url, options);
  }

  @logMethod()
  @catchError()
  public async put<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('PUT', url, options);
  }

  @logMethod()
  @catchError()
  public async delete<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('DELETE', url, options);
  }

  private async request<T>(method: string, url: string, options?: HttpRequestOptions): Promise<T> {
    const startTime = performance.now();

    try {
      const requestInit: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        signal: options?.signal,
      };

      if (options?.body && method !== 'GET' && method !== 'HEAD') {
        requestInit.body = typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body);
      }

      this.logger.debug(`HTTP ${method} request to ${url}`, { options: requestInit });

      const response = await fetch(url, requestInit);
      const duration = performance.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        this.logger.error(`HTTP ${method} failed: ${response.status} ${response.statusText}`, {
          url,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          duration: `${duration.toFixed(2)}ms`
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      let data: T;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      this.logger.debug(`HTTP ${method} success: ${response.status}`, {
        url,
        status: response.status,
        duration: `${duration.toFixed(2)}ms`
      });

      return data;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(`HTTP ${method} request failed`, {
        url,
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration.toFixed(2)}ms`
      });
      throw error;
    }
  }
}