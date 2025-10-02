class ConcreteLogger {
  log(msg: string) {}
}

class ConcreteConfig {
  apiUrl: string = "";
}

const injectable = () => (target: any) => target;
const inject = (token: any) => (target: any, propertyKey: string, parameterIndex: number) => {};

const TYPES = {
  Logger: Symbol.for("Logger"),
  Config: Symbol.for("Config")
};

@injectable()
export class MyService {
  constructor(
    @inject(TYPES.Logger) private logger: ConcreteLogger,
    @inject(TYPES.Config) private config: ConcreteConfig
  ) {}
}
