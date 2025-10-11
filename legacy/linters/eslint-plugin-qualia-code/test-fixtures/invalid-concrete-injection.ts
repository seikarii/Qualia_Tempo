class ConcreteLogger {
  log(message: string) {}
}

const injectable = () => (target: any) => target;
const inject = (token: any) => (target: any, propertyKey: string, parameterIndex: number) => {};

const TYPES = {
  ConcreteLogger: Symbol.for("ConcreteLogger")
};

@injectable()
export class MyService {
  constructor(@inject(TYPES.ConcreteLogger) private logger: ConcreteLogger) {}
}
