const injectable = () => (target: any) => target;

class ConcreteLogger {
  log(message: string) {}
}

@injectable()
export class MyService {
  constructor(private logger: ConcreteLogger) {}
}
