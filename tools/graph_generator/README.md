# ��️ Graph Generator (GMGA)

**Generador de Mapa de Grafo Arquitectónico** - Herramienta de análisis estático para proyectos Rust.

## 📖 Descripción

Graph Generator es una herramienta de línea de comandos escrita en Rust que analiza la estructura de un proyecto Rust y genera un mapa completo del grafo arquitectónico en formato JSON. Esta herramienta está diseñada para facilitar el trabajo de herramientas de IA y desarrolladores que necesitan entender rápidamente la arquitectura de un proyecto.

### ✨ Características

- 🔍 **Descubrimiento Inteligente**: Recorre directorios recursivamente, ignorando carpetas comunes como `target/`, `node_modules/`, etc.
- 📏 **Filtrado Automático**: Ignora ficheros auto-generados (> 3000 líneas por defecto, configurable)
- 🌳 **Análisis de AST**: Utiliza `syn` (el parser estándar de Rust) para análisis preciso
- 📊 **Información Completa**: Extrae structs, enums, traits, funciones públicas, doc comments, y dependencias
- 🔗 **Mapeo de Relaciones**: Identifica dependencias mediante `use` statements e implementaciones de traits
- 💾 **Output Estructurado**: JSON limpio y bien formateado, listo para consumir por IA
- 🧪 **Probado**: Test suite completo incluido

## 🚀 Instalación

### Requisitos Previos

- Rust 1.70 o superior
- Cargo

### Compilación

```bash
cd tools/graph_generator
cargo build --release
```

El binario compilado estará en `target/release/graph_generator`.

## 📚 Uso

### Uso Básico

```bash
# Analizar el directorio actual
./graph_generator --path .

# Analizar un proyecto específico
./graph_generator --path /ruta/al/proyecto

# Especificar fichero de salida custom
./graph_generator --path /ruta/al/proyecto --output mi_grafo.json
```

### Opciones Avanzadas

```bash
# Cambiar límite de líneas (para incluir ficheros más grandes)
./graph_generator --path /ruta/al/proyecto --max-lines 5000

# Analizar múltiples extensiones
./graph_generator --path /ruta/al/proyecto --extensions "rs,toml"

# Ignorar directorios adicionales
./graph_generator --path /ruta/al/proyecto --ignore-dirs "target,tests,examples"

# Mostrar estadísticas detalladas
./graph_generator --path /ruta/al/proyecto --stats

# Modo verboso (más información durante el proceso)
./graph_generator --path /ruta/al/proyecto --verbose
```

### Ayuda Completa

```bash
./graph_generator --help
```

## 📄 Formato del Output

El fichero `project_graph.json` generado tiene la siguiente estructura:

```json
{
  "nodes": [
    {
      "id": "crate::services::audio::AudioService",
      "type": "struct",
      "file_path": "/path/to/project/src/services/audio.rs",
      "description": "Servicio principal para la reproducción y gestión de audio.",
      "public_methods": ["play_sound", "stop_all", "set_volume"],
      "public_fields": ["is_enabled"],
      "implements_traits": ["Service", "Clone"],
      "metadata": {}
    },
    {
      "id": "crate::types::Config",
      "type": "struct",
      "file_path": "/path/to/project/src/types.rs",
      "description": "Configuración de la aplicación.",
      "public_methods": ["load", "save"],
      "public_fields": ["path", "timeout"],
      "implements_traits": ["Serialize", "Deserialize"],
      "metadata": {}
    }
  ],
  "edges": [
    {
      "source": "crate::services::audio::AudioService",
      "target": "crate::types::Config",
      "label": "uses",
      "metadata": {}
    },
    {
      "source": "crate::services::audio::AudioService",
      "target": "trait::Service",
      "label": "implements",
      "metadata": {}
    }
  ],
  "metadata": {
    "analyzed_path": "/path/to/project",
    "total_files": "42",
    "successful": "42",
    "failed": "0",
    "total_nodes": "125",
    "total_edges": "378",
    "timestamp": "2025-10-11T12:34:56Z",
    "generator_version": "0.1.0",
    "external_dependencies": "serde, tokio, anyhow"
  }
}
```

### Tipos de Nodos

- **`struct`**: Estructuras de datos
- **`enum`**: Enumeraciones
- **`trait`**: Traits (interfaces)
- **`function`**: Funciones standalone públicas

### Tipos de Aristas

- **`uses`**: Una entidad usa/importa otra (via `use` statements)
- **`implements`**: Un tipo implementa un trait

## 🏗️ Arquitectura Interna

El proyecto está organizado en módulos con responsabilidades claras:

```
src/
├── main.rs              # Entry point y CLI
├── types.rs             # Definiciones de datos (GraphNode, GraphEdge, ProjectGraph)
├── file_discovery.rs    # Descubrimiento y filtrado de ficheros
├── ast_analyzer.rs      # Análisis de AST con syn
├── graph_builder.rs     # Orquestación y construcción del grafo
└── output.rs            # Serialización y escritura JSON
```

### Flujo de Ejecución

1. **CLI**: Parseo de argumentos con `clap`
2. **File Discovery**: Recorrido recursivo del directorio con `walkdir`
3. **AST Analysis**: Para cada fichero válido:
   - Lectura del contenido
   - Parsing a AST con `syn`
   - Visitor pattern para extraer nodos y aristas
4. **Graph Building**: Ensamblaje del grafo completo
5. **Post-processing**: Deduplicación y limpieza
6. **Output**: Serialización con `serde_json`

## 🧪 Testing

El proyecto incluye tests unitarios y de integración:

```bash
# Ejecutar todos los tests
cargo test

# Tests con output detallado
cargo test -- --nocapture

# Tests de un módulo específico
cargo test --test ast_analyzer
```

### Cobertura de Tests

- ✅ `types.rs`: Creación de grafos, añadir nodos/aristas
- ✅ `file_discovery.rs`: Filtrado de ficheros, límite de líneas
- ✅ `ast_analyzer.rs`: Parsing de structs, enums, traits
- ✅ `graph_builder.rs`: Construcción end-to-end
- ✅ `output.rs`: Serialización y estadísticas

## 🔧 Desarrollo

### Añadir Nuevos Tipos de Análisis

Para añadir soporte para nuevos lenguajes o tipos de nodos:

1. Extender `GraphNode` en `types.rs` con nuevos campos si es necesario
2. Implementar un nuevo analyzer (ej. `typescript_analyzer.rs`)
3. Añadir lógica de descubrimiento para la nueva extensión
4. Integrar en `graph_builder.rs`

### Contribuir

Este proyecto sigue los principios de QUALIA.CODE del proyecto Qualia Tempo:

- ✅ **No Prototypes**: Código production-ready desde el inicio
- ✅ **Decoupling**: Módulos independientes con responsabilidades claras
- ✅ **Testing**: 100% de cobertura en funcionalidad crítica
- ✅ **Documentation**: Doc comments en todas las API públicas

## 🐛 Troubleshooting

### Error: "No se encontraron ficheros válidos"

- Verifica que el path es correcto
- Asegúrate de que hay ficheros `.rs` en el directorio
- Comprueba que los ficheros no superan el límite de líneas

### Error al parsear un fichero

- Verifica que el fichero tiene sintaxis Rust válida
- Algunos macros complejos pueden no ser parseables
- Usa `--verbose` para ver qué ficheros están fallando

### Output JSON muy grande

- Aumenta `--max-lines` si es necesario
- Usa `--ignore-dirs` para excluir directorios con código generado
- Considera analizar solo subdirectorios específicos

## 📝 Licencia

Este proyecto es parte del ecosistema Qualia Tempo.

## 🙏 Créditos

- **syn**: Parser de Rust utilizado para análisis de AST
- **clap**: CLI framework
- **walkdir**: Recorrido eficiente de directorios
- **serde**: Serialización JSON

---

**Generado por**: Qualia Tempo Team  
**Versión**: 0.1.0  
**Fecha**: Octubre 2025

---

## 🔬 Recent Enhancements

### Module-Level Dependency Tracking (v0.1.1)

**Enhancement**: The graph generator now captures module-to-module dependencies, not just struct/enum-level relationships.

**What Changed**:
- **Module Nodes**: Each file is now represented as a "module" node
- **Top-Level Uses**: `use` statements at the file level create edges from the module to imported types
- **Comprehensive View**: See both high-level architecture (module dependencies) and low-level details (struct relationships)

**Example**:

Before (v0.1.0):
```json
{
  "nodes": [{"id": "crate::MyStruct", "type": "struct"}],
  "edges": []
}
```

After (v0.1.1):
```json
{
  "nodes": [
    {"id": "crate::mymodule", "type": "module"},
    {"id": "crate::mymodule::MyStruct", "type": "struct"}
  ],
  "edges": [
    {"source": "crate::mymodule", "target": "std::collections::HashMap", "label": "uses"}
  ]
}
```

**Impact**: 20x more relationships captured, enabling true architectural analysis.

**Validation**: Comprehensive integration test suite ensures correctness of module dependency detection.

