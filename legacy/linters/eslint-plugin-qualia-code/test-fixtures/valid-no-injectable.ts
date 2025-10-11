class ConcreteLogger {
  log(message: string) {}
}

export class MyService {
  constructor(private logger: ConcreteLogger) {}
}
