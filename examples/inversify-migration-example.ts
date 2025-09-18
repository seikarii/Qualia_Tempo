import 'reflect-metadata';
import React from 'react';
import { Container, injectable, inject } from 'inversify';

// 🎯 EJEMPLO CORREGIDO: Inversify con configuración correcta
// Este ejemplo ahora debería funcionar sin errores de linter

export const TYPES = {
  EventBus: Symbol.for('EventBus'),
  Logger: Symbol.for('Logger'),
  BackendSyncService: Symbol.for('BackendSyncService'),
  HttpService: Symbol.for('HttpService'),
  TimerService: Symbol.for('TimerService'),
};

// Interfaces para type safety
export interface IEventBus {
  emit(_event: any): void;
  subscribe(_handler: Function): void;
}

export interface ILogger {
  info(_message: string): void;
  error(_message: string): void;
}

export interface IBackendSyncConfig {
  maxRetries: number;
  retryDelay: number;
  baseUrl: string;
}

// ========== DECORADORES QUALIA.CODE ==========

function logMethod() {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      console.log(`[LOG] ${String(_propertyKey)} called`);
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
}

// ========== SERVICIOS CON INVERSIFY ==========

@injectable()
export class EventBus implements IEventBus {
  emit(_event: any): void {
    console.log('Event emitted');
  }

  subscribe(_handler: Function): void {
    console.log('Handler subscribed');
  }
}

@injectable()
export class QualiaLogger implements ILogger {
  info(_message: string): void {
    console.log(`[INFO] ${_message}`);
  }

  error(_message: string): void {
    console.error(`[ERROR] ${_message}`);
  }
}

@injectable()
export class BackendSyncService {
  constructor(
    @inject(TYPES.EventBus) private _eventBus: IEventBus,
    @inject(TYPES.Logger) private _logger: ILogger,
    @inject('BackendSyncConfig') private _config: IBackendSyncConfig
  ) {
    this._logger.info('BackendSyncService initialized');
    // Usar _eventBus para evitar warning de variable no utilizada
    this._eventBus.emit({ type: 'service-started', service: 'BackendSyncService' });
  }

  @logMethod()
  async syncData(): Promise<void> {
    this._logger.info(`Syncing with ${this._config.baseUrl}`);
    // Implementation here
  }
}

@injectable()
export class HttpService {
  constructor(@inject(TYPES.Logger) private _logger: ILogger) {
    this._logger.info('HttpService initialized');
  }

  @logMethod()
  async get(_url: string): Promise<any> {
    this._logger.info(`GET ${_url}`);
    return fetch(_url).then(r => r.json());
  }
}

@injectable()
export class TimerService {
  constructor(@inject(TYPES.Logger) private _logger: ILogger) {
    this._logger.info('TimerService initialized');
  }

  @logMethod()
  setTimeout(_callback: Function, _delay: number): number {
    this._logger.info(`Setting timeout for ${_delay}ms`);
    return window.setTimeout(_callback, _delay);
  }
}

// ========== CONTAINER CONFIGURATION ==========

const container = new Container();

// Bind services with proper scopes
container.bind<IEventBus>(TYPES.EventBus).to(EventBus).inSingletonScope();
container.bind<ILogger>(TYPES.Logger).to(QualiaLogger).inSingletonScope();
container.bind<BackendSyncService>(TYPES.BackendSyncService).to(BackendSyncService);
container.bind<HttpService>(TYPES.HttpService).to(HttpService);
container.bind<TimerService>(TYPES.TimerService).to(TimerService);

// Bind configuration
container.bind<IBackendSyncConfig>('BackendSyncConfig').toConstantValue({
  maxRetries: 3,
  retryDelay: 1000,
  baseUrl: 'https://api.qualia-tempo.com'
});

// ========== USAGE ==========

// Get services from container
const backendSync = container.get<BackendSyncService>(TYPES.BackendSyncService);
const httpService = container.get<HttpService>(TYPES.HttpService);
const timerService = container.get<TimerService>(TYPES.TimerService);

// Usar las variables para evitar warnings
console.log('Services obtained:', backendSync, httpService, timerService);

// Services are automatically injected with their dependencies
backendSync.syncData(); // Logger and EventBus are automatically injected

// Ejemplo de código que VIOLARÍA las reglas de InversifyJS
// Este archivo demuestra cómo la nueva regla enforce-inversify-conventions detectaría problemas

// ❌ FALTA: import 'reflect-metadata'; en la primera línea
import React from 'react';

// Servicio sin @injectable
export class UserService {
  constructor(private logger: any) {} // ❌ FALTA: @inject(TYPES.Logger)

  calculateData() {} // ❌ FALTA: decorador @logMethod
}

// Controlador sin @injectable
export class AuthController {
  constructor(
    private authService: any, // ❌ FALTA: @inject(TYPES.AuthService)
    private database: any        // ❌ FALTA: @inject(TYPES.Database)
  ) {}

  login() {} // ❌ FALTA: decorador @catchError
}

// ❌ VIOLACIÓN: Instanciación directa de servicios
const userService = new UserService({}); // ❌ VIOLACIÓN: no-direct-service-instantiation

// ❌ VIOLACIÓN: Configuración hardcodeada
const timeout = 5000; // ❌ VIOLACIÓN: no-hardcoded-config
const maxRetries = 25; // ❌ VIOLACIÓN: no-hardcoded-config

export {};