interface ILogger {
  info(message: string): void;
}

const injectable = () => (target: any) => target;
const inject = (token: any) => (target: any, propertyKey: string, parameterIndex: number) => {};

const TYPES = {
  ILogger: Symbol.for("ILogger")
};

@injectable()
export class MyService {
  constructor(@inject(TYPES.ILogger) private logger: ILogger) {}
}
