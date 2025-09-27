import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { logMethod, catchError } from "../utils/decorators";
import type { ILogger } from "./interfaces/ILogger";
import type { ITimerService } from "./interfaces/ITimerService";
import type {
  IHttpService,
  HttpRequestOptions,
} from "./interfaces/IHttpService";
import type { IConfigurationService } from "./interfaces/IConfigurationService";

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
  private readonly defaultTimeout: number;

  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.ITimerService) timerService: ITimerService,
    @inject(TYPES.IConfigurationService) private config: IConfigurationService,
  ) {
    this.logger = logger;
    this.timerService = timerService;
    // QUALIA.CODE: Configuration externalized - use ConfigurationService
    this.defaultTimeout = this.config.getHttpConfig?.()?.defaultTimeout ?? 30000;
    this.logger.info("HttpService initialized with fetch abstraction");
  }

  @logMethod()
  @catchError()
  public async get<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("GET", url, options);
  }

  @logMethod()
  @catchError()
  public async post<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("POST", url, options);
  }

  @logMethod()
  @catchError()
  public async put<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("PUT", url, options);
  }

  @logMethod()
  @catchError()
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

    // QUALIA.CODE v1.1: Platform Abstraction - Timeout management encapsulated in HttpService
    const { timeout, ...fetchOptions } = options || {};
    const effectiveTimeout = timeout ?? this.defaultTimeout; // QUALIA.CODE: Configuration externalized to avoid circular dependency

    const controller = new AbortController();
    const timeoutId = this.timerService.setTimeout(() => {
      this.logger.error(
        `HTTP ${method} request timeout triggered after ${effectiveTimeout}ms for URL: ${url}`,
      );
      controller.abort();
    }, effectiveTimeout);

    try {
      const requestInit: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...fetchOptions.headers,
        },
        signal: controller.signal,
      };

      if (fetchOptions.body && method !== "GET" && method !== "HEAD") {
        requestInit.body =
          typeof fetchOptions.body === "string"
            ? fetchOptions.body
            : JSON.stringify(fetchOptions.body);
      }

      this.logger.debug(`HTTP ${method} request to ${url}`, {
        options: requestInit,
      });

      const response = await fetch(url, requestInit);
      const duration = performance.now() - startTime;

      // Clear timeout on successful response
      this.timerService.clearTimeout(timeoutId);

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

      const contentType = response.headers.get("content-type");
      let data: T;

      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      this.logger.debug(`HTTP ${method} success: ${response.status}`, {
        url,
        status: response.status,
        duration: `${duration.toFixed(2)}ms`,
      });

      return data;
    } catch (error) {
      // Clear timeout on error
      this.timerService.clearTimeout(timeoutId);

      const duration = performance.now() - startTime;

      // QUALIA.CODE v1.1: Platform Abstraction - Handle timeout errors specifically
      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError = new RequestTimeoutError(
          `HTTP ${method} request timed out after ${effectiveTimeout}ms`,
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
      throw error;
    }
  }

  @logMethod()
  @catchError()
  public updateConfig(timeout: number): void {
    (this as any).defaultTimeout = timeout;
    this.logger.debug("HttpService configuration updated", { timeout });
  }
}
