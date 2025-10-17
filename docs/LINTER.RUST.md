# LINTER.RUST.md - Guía Maestra de Linting para Qualia Tempo
# VERSION: 1.0
# TARGET: Qualia Tempo Rust Edition
# COMPLIANCE: QUALIA.CODE.RUST v1.1, ARCHITECTURE.RUST v2.0

---

## 1. Filosofía y Propósito

Este documento define la configuración de linting para el proyecto de reescritura en Rust. El linter no es una herramienta de sugerencias; es el **guardián no-negociable de la arquitectura**. Su propósito es fallar la compilación si cualquier pieza de código viola los principios definidos en `QUALIA.CODE.RUST` y `ARCHITECTURE.RUST`.

Dado que los agentes de IA construirán el código, las reglas deben ser estrictas (`deny`) para forzar el cumplimiento y evitar la deriva hacia soluciones subóptimas. El "path de menor resistencia" debe ser el camino arquitectónicamente correcto.

---

## 2. Configuración de Clippy Estándar (`clippy.toml`)

Estas son las reglas base que se aplicarán a todo el workspace. Se configuran en el `Cargo.toml` raíz o en un archivo `clippy.toml` dedicado.

```toml
# Configuración para clippy.toml o la sección [workspace.lints.clippy] en Cargo.toml

# --- Nivel de Pedantería: Exigir código idiomático y explícito ---
pedantic = "deny"
nursery = "deny"
style = "deny"
perf = "deny"
complexity = "deny"
cargo = "deny"

# --- Reglas Críticas de Seguridad y Correctitud (Deny) ---
# Prohibir unwraps y expects en código de producción. Forzar manejo de errores.
unwrap_used = "deny"
expect_used = "deny"

# Prohibir APIs de pánico explícito.
panic = "deny"

# Prohibir código de depuración residual.
print_stdout = "deny"
print_stderr = "deny"
dbg_macro = "deny"

# Evitar conversiones que pueden truncar datos silenciosamente.
cast_possible_truncation = "deny"
cast_precision_loss = "deny"
cast_sign_loss = "deny"

# Forzar el uso de tipos numéricos seguros.
float_arithmetic = "deny" # Requiere justificación explícita para su uso.

# --- Reglas de Complejidad (Deny) ---
# Mantener las funciones enfocadas y legibles.
cognitive_complexity_threshold = 20 # Límite estricto (aumentado de 15 para render loops).
cyclomatic_complexity = 30 # Límite máximo absoluto.
too_many_lines = "deny" # El límite por defecto es suficiente.
too_many_arguments = "deny" # Forzar el uso de structs de configuración.

# --- Reglas de Estilo y Claridad (Deny) ---
# Forzar la documentación en todo el código público.
missing_docs_in_private_items = "allow" # Permitido en privado.
missing_errors_doc = "deny" # Las funciones que devuelven Result<> DEBEN documentar sus errores.
missing_panics_doc = "deny" # Las funciones que pueden panicar DEBEN documentarlo.

# Forzar el uso de tipos explícitos.
implicit_return = "deny"
let_underscore_drop = "deny"

# --- Reglas de Rendimiento (Deny) ---
# Evitar asignaciones de memoria innecesarias en bucles.
significant_drop_in_scrutinee = "deny"

# Evitar clones innecesarios de tipos Copy.
clone_on_copy = "deny"

# --- Reglas que se permiten (Allow) ---
# Estas reglas son demasiado ruidosas o entran en conflicto con patrones de diseño válidos en nuestro caso.
# Cada una de estas anulaciones es una decisión de diseño deliberada.
must_use_candidate = "allow" # Demasiado agresivo para nuestro caso de uso.
module_name_repetitions = "allow" # Aceptable para la organización (e.g., services::game_logic::GameLogicService).
```

---

## 3. Lints Arquitectónicos Personalizados (`qualia-lints`)

La mayoría de las reglas de `@qualia-tempo/qualia-code` no tienen un equivalente directo en `clippy`. Por lo tanto, se creará un crate de lints personalizados llamado `qualia-lints` que se ejecutará como parte de nuestro proceso de CI.

**Propuesta de Implementación:** Utilizar `dylint` o la API interna de `clippy` para crear estas reglas.

A continuación se presenta la **tabla maestra** de reglas propuestas para `qualia-lints`. Cada regla incluye su intención original (mapeada desde ESLint/MyPy/Ruff), descripción en Rust, nivel de severidad, y justificación vinculada a principios de QUALIA.CODE.RUST o ARCHITECTURE.RUST.v2.0.

| ID de la Regla (Propuesta) | Intención Original (ESLint/MyPy/Ruff) | Descripción de la Regla en Rust | Nivel | Justificación Arquitectónica |
| :--- | :--- | :--- | :--- | :--- |
| **TESTING (✅ IMPLEMENTED - BUILD-TIME)** |
| `qualia_lints::no_inline_tests` | N/A (Nuevo) | **✅ ACTIVO:** Implementado via `build.rs`. Prohíbe `#[cfg(test)]` en archivos `src/`. Tests DEBEN estar en `tests/`. **FALLA LA COMPILACIÓN** automáticamente. Excepciones: `lib.rs`, `main.rs`. | `deny` | QUALIA.CODE.RUST §3.2: Separación producción/tests. Enforcement en tiempo de compilación. |
| **ARQUITECTURA Y DI** |
| `qualia-lints::enforce-responsibility-header` | N/A (Nuevo) | **MANDATO:** Cada `pub struct`, `pub trait` y `pub mod` DEBE tener un comentario de documentación que comience con `/// # Responsibility`. | `deny` | QUALIA.CODE.RUST §1.1: Documentación estructurada para claridad arquitectónica. |
| `qualia-lints::no-direct-service-instantiation` | `no-direct-service-instantiation` | Prohíbe la llamada a `Struct::new()` en cualquier struct que implemente un trait de servicio (ej. `IGameLogicService`). Solo se permite dentro del `CompositionRoot` (`main.rs`). | `deny` | QUALIA.CODE.RUST §2.1: Inversion of Control - servicios solo se instancian via DI container. |
| `qualia-lints::enforce-shaku-interfaces` | `enforce-interface-based-injection` | Verifica que las inyecciones con `#[shaku(inject)]` siempre usen el tipo `Arc<dyn ITrait>` y no un tipo concreto como `Arc<MyService>`. | `deny` | QUALIA.CODE.RUST §2.3: Dependency Inversion Principle - inyección basada en interfaces. |
| `qualia-lints::no-service-locator-pattern` | `no-service-locator` | Prohíbe llamar a `module.resolve()` fuera del `main.rs` o de las factorías de tests autorizadas. | `deny` | QUALIA.CODE.RUST §2.1: Evitar Service Locator anti-pattern. |
| `qualia-lints::enforce-ioc-initialization-order` | `enforce-ioc-binding-order` | Verifica orden de registro en Shaku modules para prevenir dependencias circulares. | `deny` | QUALIA.CODE.RUST §2.1: Composition Root pattern con orden de inicialización definido. |
| `qualia-lints::enforce-injection-lifetime` | `enforce-correct-injection-scope` | Verifica scopes de inyección (singleton vs transient) según el uso del servicio. | `deny` | QUALIA.CODE.RUST §2.1: Gestión apropiada de lifetime de dependencias. |
| `qualia-lints::validate-injection-existence` | `validate-injection-existence` | Verifica que todas las dependencias inyectadas estén registradas en el container. | `deny` | QUALIA.CODE.RUST §2.1: Type safety en tiempo de compilación para DI. |
| **EVENTOS** |
| `qualia-lints::no-manual-event-subscription` | `no-manual-event-subscription` | Detecta llamadas a `event_bus.subscribe()` seguidas de un `loop` y `recv()`. Sugiere usar la macro `#[handle_event]` en su lugar para estandarizar el manejo. | `warn` | ARCHITECTURE.RUST.v2.0 §4.2: Event-driven architecture con handlers estandarizados. |
| `qualia-lints::enforce-eventbus-broadcast` | N/A (Nuevo) | Asegura que cualquier struct llamado `EventBus` o que implemente `IEventBus` utilice `tokio::sync::broadcast` internamente y no un `Arc<RwLock<...>>`. | `deny` | QUALIA.CODE.RUST §4.1: Lock-free event distribution con tokio::sync::broadcast. |
| `qualia-lints::enforce-event-validation` | `enforce-validate-event-property-on-emit` | Validación de propiedades de eventos antes de emit usando macros de validación. | `deny` | QUALIA.CODE.RUST §4.2: Type safety y validación en contratos de eventos. |
| `qualia-lints::enforce-event-adaptation` | `enforce-adapt-and-emit-on-raw-handlers` | Macros de adaptación de eventos raw a contratos tipados antes de emit. | `deny` | QUALIA.CODE.RUST §4.2: Adaptación protocolaria en boundaries de eventos. |
| **FRONTEND - PATRÓN ISCENE** |
| `qualia-lints::enforce-scene-trait-usage` | N/A (Nuevo - Arquitectura Frontend) | Asegura que los componentes de alto nivel que gestionan un bucle de juego (como CombatScene, MenuScene) implementen el trait `IScene`. | `deny` | ARCHITECTURE.RUST.v2.0 §6: Patrón IScene para encapsulación de lógica de renderizado y actualización. |
| `qualia-lints::no-direct-renderer-access` | N/A (Nuevo - Arquitectura Frontend) | Prohíbe que los servicios de lógica de juego accedan directamente al `KairosVisualEngine`. Solo la escena activa puede hacerlo a través de su método `render()`. | `deny` | ARCHITECTURE.RUST.v2.0 §6: Separación de responsabilidades - lógica de juego vs renderizado. |
| **MACROS Y ATRIBUTOS (ADAPTACIÓN DE DECORADORES TYPESCRIPT)** |
| `qualia-lints::enforce-tracing-instrument` | `enforce-measure-time-on-logic-services` | **MANDATO:** Todos los métodos `pub async fn` en structs que implementen un trait de servicio deben tener el atributo `#[tracing::instrument]`. | `deny` | QUALIA.CODE.RUST §6.1: Observabilidad estructurada con tracing. |
| `qualia-lints::enforce-cached-macro` | `enforce-cache-decorator` | Detecta métodos que implementan caching manual y sugiere usar `#[cached]` de `qualia_macros`. | `warn` | QUALIA.CODE.RUST §5.2: Optimización de rendimiento con caching automático. |
| `qualia-lints::enforce-mutex-macro` | `enforce-mutex-on-state-mutations` | Métodos que mutan estado compartido deben usar `#[with_mutex]` o patrones de locking apropiados. | `deny` | QUALIA.CODE.RUST §4.3: Concurrencia segura con locking automático. |
| `qualia-lints::enforce-retry-macro` | `enforce-retry-on-io-operations` | Operaciones I/O deben usar `#[retry]` en lugar de bucles manuales de reintento. | `warn` | QUALIA.CODE.RUST §6.2: Resiliencia con reintentos automáticos. |
| `qualia-lints::enforce-async-macro` | `enforce-async-on-heavy-methods` | Métodos computacionalmente pesados deben ser marcados con `#[async]` o `#[spawn_blocking]`. | `deny` | QUALIA.CODE.RUST §3.3: Asincronía para operaciones pesadas. |
| `qualia-lints::enforce-timeout-macro` | `enforce-timeout-on-async-operations` | Operaciones async deben usar `#[with_timeout]` para prevenir hangs. | `deny` | QUALIA.CODE.RUST §6.2: Timeouts para prevenir deadlocks. |
| `qualia-lints::enforce-worker-macro` | `enforce-worker-offloading` | Computaciones pesadas en async contexts deben usar `#[spawn_blocking]`. | `deny` | ARCHITECTURE.RUST.v2.0 §3.2: Offloading a worker threads. |
| `qualia-lints::enforce-throttle-macro` | `enforce-throttle-on-event-handlers` | Handlers de eventos deben usar `#[throttle]` para rate limiting. | `deny` | QUALIA.CODE.RUST §5.1: Rate limiting para estabilidad. |
| `qualia-lints::enforce-debounce-macro` | `enforce-debounce-on-ui-inputs` | Inputs del usuario deben usar `#[debounce]` (adaptado a backend event throttling). | `warn` | QUALIA.CODE.RUST §5.1: Debouncing para inputs de usuario. |
| `qualia-lints::enforce-rate-limit-macro` | `enforce-rate-limit-on-api-calls` | Llamadas a APIs externas deben usar `#[rate_limit]`. | `deny` | QUALIA.CODE.RUST §5.1: Rate limiting para APIs externas. |
| `qualia-lints::enforce-authorize-macro` | `enforce-authorize-on-secure-methods` | Métodos que requieren autorización deben usar `#[authorize]`. | `deny` | QUALIA.CODE.RUST §6.3: Autorización en métodos seguros. |
| `qualia-lints::enforce-profile-macro` | `enforce-profile-on-heavy-computation` | Computaciones pesadas deben usar `#[profile]` para monitoring. | `warn` | QUALIA.CODE.RUST §5.3: Profiling para optimización. |
| `qualia-lints::enforce-validation-macro` | `enforce-validation-on-boundaries` | Boundaries de entrada deben usar `#[validate]` con structs de validación. | `deny` | QUALIA.CODE.RUST §6.4: Validación en boundaries públicas. |
| `qualia-lints::enforce-readonly-macro` | `enforce-readonly-on-config-access` | Acceso a configuración debe usar `#[readonly]` para prevenir mutación accidental. | `warn` | QUALIA.CODE.RUST §2.2: Configuración inmutable. |
| `qualia-lints::enforce-deprecated-macro` | `enforce-deprecated-on-comment` | APIs obsoletas deben usar `#[deprecated]` con mensaje explicativo. | `deny` | QUALIA.CODE.RUST §7.1: Deprecación estructurada. |
| **TESTING** |
| `qualia-lints::enforce-high-fidelity-mocks` | `enforce-high-fidelity-mocks` | Verifica que los mocks creados con `mockall::mock!` tengan expectativas que devuelvan valores type-safe apropiados según el tipo de retorno de los métodos. | `deny` | QUALIA.CODE.RUST §10.3.1: High-fidelity mocking para tests confiables. |
| `qualia-lints::enforce-isolated-test-container` | `enforce-isolated-test-container` | Fuerza el uso de `create_test_module()` en tests unitarios en lugar de compartir contenedores globales. | `deny` | QUALIA.CODE.RUST §10.2: Test isolation para evitar contaminación cruzada. |
| **LOGGING Y OBSERVABILIDAD** |
| `qualia-lints::enforce-tracing-macros` | `no-console-in-services` | Prohíbe el uso de `println!`, `eprintln!`, `dbg!` en servicios. Fuerza el uso de macros de `tracing`. | `deny` | QUALIA.CODE.RUST §6.1: Logging estructurado con tracing. |
| `qualia-lints::enforce-error-handling` | `enforce-error-boundary-on-async` | Verifica que todas las funciones async manejen errores apropiadamente y no usen `unwrap()` o `expect()`. | `deny` | QUALIA.CODE.RUST §6.2: Manejo robusto de errores. |
| `qualia-lints::enforce-logging-abstraction` | `no-direct-diagnostic-calls` | Abstracción de logging para prevenir llamadas directas a crates de logging. | `deny` | QUALIA.CODE.RUST §6.1: Abstracción de logging. |
| **VALIDACIÓN Y SEGURIDAD** |
| `qualia-lints::enforce-validation-on-public-methods` | `enforce-validation-on-public-methods` | Validación en métodos públicos usando macros de validación. | `deny` | QUALIA.CODE.RUST §6.4: Validación en boundaries. |
| **PLATFORM ABSTRACTION** |
| `qualia-lints::enforce-timer-abstraction` | `no-direct-timer-access` | Abstracción de timers para independencia de plataforma. | `deny` | QUALIA.CODE.RUST §7.2: Platform abstraction. |
| `qualia-lints::enforce-platform-abstraction` | `no-global-api-calls` | Abstracción de APIs globales para portabilidad. | `deny` | QUALIA.CODE.RUST §7.2: Platform abstraction. |
| **CODE QUALITY** |
| `qualia-lints::enforce-shaku-conventions` | `enforce-inversify-conventions` | Convenciones de nomenclatura y estructura para Shaku. | `deny` | QUALIA.CODE.RUST §2.1: Consistencia en DI. |
| `qualia-lints::enforce-event-contracts-location` | `enforce-event-interfaces-location` | Ubicación correcta de contratos de eventos. | `deny` | QUALIA.CODE.RUST §4.2: Organización de contratos. |
| `qualia-lints::enforce-interface-adherence` | `MQA001: Interface adherence validation` | Verificación de implementación completa de traits. | `deny` | QUALIA.CODE.RUST §1.2: Type safety en interfaces. |
| `qualia-lints::enforce-macro-return-types` | `MQA004: Decorator return type conformity` | Verificar tipos de retorno de macros. | `deny` | QUALIA.CODE.RUST §1.2: Type safety en macros. |

---

## 4. Análisis de Reglas Legacy

Este documento se basa en un análisis exhaustivo de las reglas del sistema de linting legacy (ESLint, MyPy, Ruff). La mayoría de las reglas se han adaptado a equivalentes en Rust, ya sea mediante configuración de Clippy o reglas personalizadas en `qualia-lints`.

**Reglas Obsoletas en Rust:** Ciertas reglas legacy son intrínsecamente irrelevantes en Rust debido a diferencias fundamentales en el paradigma:
- React-specific patterns (hooks, components, useState)
- JavaScript platform APIs (setTimeout, Web Workers, DOM)
- Decorator ordering (macros no tienen dependencias de orden)
- Browser-only code patterns

Para detalles completos del mapeo, consultar la tabla maestra en la Sección 3.

---

## 5. Anulación de Reglas (`#[allow(...)]`)

Cualquier anulación de una regla de `clippy` o de `qualia-lints` es una deuda técnica y debe ser tratada como tal.

**Protocolo de Anulación:**
1.  El uso de `#[allow(...)]` está **prohibido** por defecto.
2.  La línea `#[allow(...)]` debe ir acompañada de un comentario que justifique la razón técnica de forma explícita y concisa.
    ```rust
    // JUSTIFICACIÓN: Este método interactúa directamente con una FFI de C que no es Send.
    #[allow(clippy::non_send_fields_in_send_ty)]
    pub struct FfiWrapper { ... }
    ```


---

## 6. Herramientas Adicionales (Más Allá de Clippy)

Ciertas validaciones complejas no pueden ser realizadas eficientemente por un linter estático.

*   **Detección de Dependencias Circulares:**
    *   **Intención Original:** `detect-circular-dependencies`.
    *   **Solución Rust:** Se creará un script en `scripts/` que utilizará `cargo depgraph` para generar un grafo de dependencias y lo analizará en busca de ciclos a nivel de crate y de módulo. Este script se ejecutará en la pipeline de CI.

*   **Análisis de Grafo de Inyección de Dependencias:**
    *   **Intención Original:** `enforce-ioc-binding-order`, `validate-injection-existence`.
    *   **Solución Rust:** Se creará una prueba de integración (`tests/architecture/di_graph_test.rs`) que construirá el `ShakuModule` completo y verificará programáticamente que todas las dependencias pueden ser resueltas, previniendo errores de DI en tiempo de ejecución.

---

## 7. Implementación de Macros Arquitectónicos

Para implementar las macros que reemplazan los decoradores, se creará el crate `qualia_macros`:

```rust
// qualia_macros/src/lib.rs
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

#[proc_macro_attribute]
pub fn cached(_attr: TokenStream, item: TokenStream) -> TokenStream {
    // Implementación de caching automático
    let input = parse_macro_input!(item as ItemFn);
    // ... lógica de caching
}

#[proc_macro_attribute]
pub fn retry(attr: TokenStream, item: TokenStream) -> TokenStream {
    // Implementación de reintentos automáticos
    let input = parse_macro_input!(item as ItemFn);
    // ... lógica de retry
}

#[proc_macro_attribute]
pub fn with_timeout(attr: TokenStream, item: TokenStream) -> TokenStream {
    // Implementación de timeouts
    let input = parse_macro_input!(item as ItemFn);
    // ... lógica de timeout
}
```

### 7.1. Ejemplos de Uso de Macros

```rust
use qualia_macros::*;

#[cached]
pub async fn expensive_calculation(&self, input: ComplexInput) -> Result<ExpensiveResult> {
    // Esta función será automáticamente cacheada
}

#[retry(max_attempts = 3, delay_ms = 100)]
pub async fn unreliable_api_call(&self) -> Result<ApiResponse> {
    // Reintentos automáticos en caso de fallo
}

#[with_timeout(5000)] // 5 segundos
pub async fn long_running_operation(&self) -> Result<Output> {
    // Timeout automático
}

#[tracing::instrument]
pub async fn process_game_action(&self, action: PlayerAction) -> Result<GameState> {
    // Logging automático de entrada/salida
}
```

---

## 8. Configuración de CI/CD

```yaml
# .github/workflows/rust.yml
- name: Run Clippy
  run: cargo clippy --all-targets -- -D warnings

- name: Build (includes qualia_lints enforcement)
  run: cargo build --all-targets  # Will FAIL if architectural violations exist

- name: Test
  run: cargo test --all-targets
```

**Note:** `qualia_lints` enforcement happens automatically during build via `build.rs`. No separate lint command required.

---

## 9. Implementation Status

| Lint Rule | Status | Mechanism | Crates | Failure |
|-----------|--------|-----------|--------|---------|
| `no_inline_tests` | ✅ **ENFORCED** | `build.rs` | shared_core | Compilation fails |
| All other rules | 📋 Roadmap | Future `build.rs` | TBD | TBD |

**Integration:** Add `qualia_lints` as `build-dependency`:

```toml
[build-dependencies]
qualia_lints = { path = "../qualia_lints" }
```

**Execution:** Automatic on `cargo build`. Exits with code 1 if violations detected.

---

*"From TypeScript Decorators to Rust Macros. Every architectural pattern, reborn in compile-time power."*

**Last Updated:** 2025-01-18 - NO_INLINE_TESTS enforced via build.rs ✅

**END OF LINTER.RUST.md v1.1**
