# Examples

Este directorio contiene ejemplos y archivos de prueba para el proyecto Qualia Tempo.

## Contenido

- `inversify-migration-example.ts` - Ejemplo de migración a InversifyJS con decoradores @inject y @injectable funcionando correctamente.
- `decorator-examples.ts` - Ejemplos de uso de decoradores transversales (@logMethod, @catchError, @throttle).
- `inversify-test.ts` - Ejemplo de testing con contenedor de InversifyJS y mocks.

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
  constructor(@inject(TYPES.Logger) logger: ILogger) {
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