import 'reflect-metadata';
import { Container, injectable, inject } from 'inversify';
import { EventBus } from './EventBus';
import { QualiaLogger } from './Logger';
import { BackendSyncConfig } from './ConfigurationService';

// 🎯 INVERSIFY MIGRATION EXAMPLE
// Comparación: DI Manual vs Inversify

// ========== DI MANUAL ACTUAL ==========
export class BackendSyncServiceManual {
  constructor(
    eventBus: EventBus,
    logger: QualiaLogger,
    config: BackendSyncConfig
  ) {
    // Constructor injection manual
  }
}

// ========== DI INVERSIFY PROPUESTA ==========
export const TYPES = {
  EventBus: Symbol.for('EventBus'),
  Logger: Symbol.for('Logger'),
  BackendSyncService: Symbol.for('BackendSyncService'),
  HttpService: Symbol.for('HttpService'),
  TimerService: Symbol.for('TimerService'),
};

@injectable()
export class BackendSyncServiceInversify {
  constructor(
    @inject(TYPES.EventBus) private eventBus: EventBus,
    @inject(TYPES.Logger) private logger: QualiaLogger,
    @inject('BackendSyncConfig') private config: BackendSyncConfig
  ) {
    // Inyección automática por decoradores
  }
}

@injectable()
export class HttpService {
  constructor(@inject(TYPES.Logger) private logger: QualiaLogger) {}
}

@injectable()
export class TimerService {
  constructor(@inject(TYPES.Logger) private logger: QualiaLogger) {}
}

// Container configuration
const container = new Container();

// Bind services
container.bind<EventBus>(TYPES.EventBus).to(EventBus).inSingletonScope();
container.bind<QualiaLogger>(TYPES.Logger).to(QualiaLogger).inSingletonScope();
container.bind<BackendSyncServiceInversify>(TYPES.BackendSyncService).to(BackendSyncServiceInversify);
container.bind<HttpService>(TYPES.HttpService).to(HttpService);
container.bind<TimerService>(TYPES.TimerService).to(TimerService);

// Named binding for config
container.bind<BackendSyncConfig>('BackendSyncConfig').toConstantValue({
  // config object
});

// Usage
const backendSync = container.get<BackendSyncServiceInversify>(TYPES.BackendSyncService);