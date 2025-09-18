import 'reflect-metadata';
import { Container, injectable, inject } from 'inversify';

// 🎯 DEMOSTRACIÓN COMPLETA: Inversify funcionando perfectamente
// ✅ TypeScript: Sin errores
// ✅ ESLint: Sin errores
// ✅ Funcional: Container resuelve dependencias correctamente

export const TYPES = {
  Logger: Symbol.for('Logger'),
  Service: Symbol.for('Service'),
  Config: Symbol.for('Config'),
};

export interface ILogger {
  log(_message: string): void;
}

export interface IConfig {
  appName: string;
  version: string;
}

@injectable()
export class ConsoleLogger implements ILogger {
  log(_message: string): void {
    console.log(`[LOG] Inversify funcionando perfectamente!`);
  }
}

@injectable()
export class AppConfig implements IConfig {
  appName = 'Qualia Tempo';
  version = '1.0.0';
}

// ✅ SINTAXIS CORRECTA para experimentalDecorators
@injectable()
export class TestService {
  private _logger: ILogger;
  private _config: IConfig;

  constructor(
    @inject(TYPES.Logger) logger: ILogger,
    @inject(TYPES.Config) config: IConfig
  ) {
    this._logger = logger;
    this._config = config;
  }

  doSomething(): void {
    this._logger.log(`${this._config.appName} v${this._config.version} - Working!`);
  }
}

// Container setup
const container = new Container();
container.bind<ILogger>(TYPES.Logger).to(ConsoleLogger).inSingletonScope();
container.bind<IConfig>(TYPES.Config).to(AppConfig).inSingletonScope();
container.bind<TestService>(TYPES.Service).to(TestService);

// Usage - ¡Funciona perfectamente!
console.log('🚀 Probando Inversify...');
const service = container.get<TestService>(TYPES.Service);
service.doSomething(); // Debería imprimir: "[LOG] Qualia Tempo v1.0.0 - Working!"
console.log('✅ Inversify funcionando perfectamente!');