import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { logMethod, catchError } from "../utils/decorators";
import type { ILogger } from "./interfaces/ILogger";
import type { ITimerService } from "./interfaces/ITimerService";
import type {
  IHttpService,
  HttpRequestOptions,
} from "./interfaces/IHttpService";
import type { HttpConfig } from "./contracts/IHttpService.contracts";

// QUALIA.CODE v1.1: Platform Abstraction - Custom error for timeout handling
export class RequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestTimeoutError";
  }
}

@injectable()
export class HttpService implements IHttpService {
  private readonly logger: ILogger;
  private readonly timerService: ITimerService;
  private readonly config: HttpConfig;

  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.ITimerService) timerService: ITimerService,
    @inject(TYPES.HttpConfig) config: HttpConfig,
  ) {
    this.logger = logger;
    this.timerService = timerService;
    this.config = config;
    this.logger.info("HttpService initialized with fetch abstraction", {
      defaultTimeout: this.config.timeout
    });
  }

  @logMethod
  @catchError
  public async get<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("GET", url, options);
  }

  @logMethod
  @catchError
  public async post<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("POST", url, options);
  }

  @logMethod
  @catchError
  public async put<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("PUT", url, options);
  }

  @logMethod
  @catchError
  public async delete<T>(
    url: string,
    options?: HttpRequestOptions,
  ): Promise<T> {
    return this.request<T>("DELETE", url, options);
  }

  private async request<T>(
    method: string,
    url: string,
    options?: HttpRequestOptions,
  ): Promise<T> {
    const startTime = performance.now();
    const { timeout, ...fetchOptions } = options ?? {};
    const effectiveTimeout = timeout ?? this.config.timeout;

    const { controller, timeoutId } = this.setupRequestTimeout(method, url, effectiveTimeout);

    try {
      const requestInit = this.buildRequestInit(method, fetchOptions, controller.signal);
      this.logger.debug(`HTTP ${method} request to ${url}`, { options: requestInit });

      const response = await fetch(url, requestInit);
      this.timerService.clearTimeout(timeoutId);

      const data = await this.handleResponse<T>(response, method, url, startTime);
      return data;
    } catch (error) {
      this.timerService.clearTimeout(timeoutId);
      this.handleRequestError({ error, method, url, timeout: effectiveTimeout, startTime });
      throw error;
    }
  }

  private setupRequestTimeout(method: string, url: string, timeout: number) {
    const controller = new AbortController();
    const timeoutId = this.timerService.setTimeout(() => {
      this.logger.error(
        `HTTP ${method} request timeout triggered after ${timeout}ms for URL: ${url}`,
      );
      controller.abort();
    }, timeout);

    return { controller, timeoutId };
  }

  private buildRequestInit(
    method: string,
    fetchOptions: Omit<HttpRequestOptions, 'timeout'>,
    signal: AbortSignal
  ): RequestInit {
    const requestInit: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
      signal,
    };

    if (fetchOptions.body && method !== "GET" && method !== "HEAD") {
      requestInit.body =
        typeof fetchOptions.body === "string"
          ? fetchOptions.body
          : JSON.stringify(fetchOptions.body);
    }

    return requestInit;
  }

  private async handleResponse<T>(
    response: Response,
    method: string,
    url: string,
    startTime: number
  ): Promise<T> {
    const duration = performance.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      this.logger.error(
        `HTTP ${method} failed: ${response.status} ${response.statusText}`,
        {
          url,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          duration: `${duration.toFixed(2)}ms`,
        },
      );
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} - ${errorText}`,
      );
    }

    const data = await this.parseResponseData<T>(response);
    this.logger.debug(`HTTP ${method} success: ${response.status}`, {
      url,
      status: response.status,
      duration: `${duration.toFixed(2)}ms`,
    });

    return data;
  }

  private async parseResponseData<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
      return await response.json();
    }
    
    return (await response.text()) as unknown as T;
  }

  private handleRequestError(params: {
    error: unknown;
    method: string;
    url: string;
    timeout: number;
    startTime: number;
  }): void {
    const { error, method, url, timeout, startTime } = params;
    const duration = performance.now() - startTime;

    if (error instanceof Error && error.name === "AbortError") {
      const timeoutError = new RequestTimeoutError(
        `HTTP ${method} request timed out after ${timeout}ms`,
      );
      this.logger.error(`HTTP ${method} request failed`, {
        url,
        error: timeoutError.message,
        duration: `${duration.toFixed(2)}ms`,
      });
      throw timeoutError;
    }

    this.logger.error(`HTTP ${method} request failed`, {
      url,
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration.toFixed(2)}ms`,
    });
  }
}
