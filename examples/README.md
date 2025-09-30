# Examples

Este directorio contiene ejemplos y archivos de referencia para el proyecto Qualia Tempo, siguiendo los estándares QUALIA.CODE v1.1.

## Contenido

- `inversify-migration-example.ts` - Ejemplo de migración a InversifyJS con decoradores @inject y @injectable funcionando correctamente.
- `decorator-examples.ts` - Ejemplos de uso de decoradores transversales (@logMethod, @catchError, @throttle).
- `inversify-test.ts` - Ejemplo de testing con contenedor de InversifyJS y mocks.

## Arquitectura de Ejemplos

Los ejemplos demuestran las mejores prácticas de QUALIA.CODE:

### ✅ Patrón IoC con InversifyJS
```typescript
// ❌ PROHIBIDO - Instanciación directa
const service = new MyService();

// ✅ CORRECTO - Inyección de dependencias
@Injectable()
export class MyService {
  constructor(
    @inject(TYPES.Logger) private logger: ILogger,
    @inject(TYPES.EventBus) private eventBus: IEventBus
  ) {}
}
```

### ✅ Decoradores Transversales
```typescript
@injectable()
export class MyService implements IMyService {
  @logMethod()
  @catchError()
  @throttle(250)
  async processQualiaState(state: QualiaState): Promise<void> {
    // Lógica de negocio pura
  }
}
```

### ✅ Testing con IoC
```typescript
// Configuración de contenedor de test
const container = createTestContainer();
const service = container.get<IMyService>(TYPES.IMyService);

// Testing con dependencias mockeadas
describe('MyService', () => {
  it('should process state correctly', async () => {
    const result = await service.processQualiaState(testState);
    expect(result).toBeDefined();
  });
});
```

## Uso

Los archivos en este directorio son ejemplos de referencia y pueden ser utilizados como base para implementaciones futuras siguiendo los estándares QUALIA.CODE v1.1.

### Ejemplos Destacados

#### InversifyJS Migration
Muestra cómo migrar de instanciación manual a inyección de dependencias:

```typescript
// ❌ Antes (PROHIBIDO)
const service = new MyService();

// ✅ Después (CORRECTO)
@injectable()
class MyService {
  constructor(@inject(TYPES.IDependency) private dep: IDependency) {
    // Inyección automática
  }
}
```

#### Decoradores Transversales
Demuestra el uso de decoradores para lógica transversal:

```typescript
@logMethod()
@catchError()
@throttle(250)
async processQualiaState(state: QualiaState) {
  // Lógica de negocio pura
}
```

#### Testing con IoC
Ejemplo de testing aislado con contenedor de test:

```typescript
const container = createTestContainer();
const service = container.get<IMyService>(TYPES.IMyService);
// Testing con dependencias mockeadas
```

## Estructura de Ejemplos

```
examples/
├── inversify-migration-example.ts    # Migración a IoC
├── decorator-examples.ts             # Decoradores transversales
├── inversify-test.ts                 # Testing con mocks
└── README.md                         # Esta documentación
```

## Contribución

Para agregar nuevos ejemplos:

1. **Seguir QUALIA.CODE**: Todos los ejemplos deben cumplir con los estándares arquitectónicos
2. **Documentación**: Incluir comentarios explicativos y referencias a reglas
3. **Testing**: Proporcionar ejemplos de testing cuando aplique
4. **Consistencia**: Mantener el estilo y estructura de los ejemplos existentes

## Referencias

- [QUALIA.CODE v1.1](../docs/QUALIA.CODE.md) - Estándares arquitectónicos
- [Arquitectura del Proyecto](../docs/architecture_v2.md) - Documentación técnica
- [Guía de Desarrollo](../qualia-tempo-prototype/README.md) - Setup y desarrollo