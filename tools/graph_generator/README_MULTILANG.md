# Graph Generator - Multi-Language Support

## 🎯 Responsibility
Generador de Mapa de Grafo Arquitectónico (GMGA) con soporte para **Rust, TypeScript y Python**.

---

## 🚀 Features

### ✅ Lenguajes Soportados

| Lenguaje   | Extensiones | Características Extraídas |
|------------|-------------|---------------------------|
| **Rust**   | `.rs`       | structs, enums, traits, functions, impl blocks, use statements |
| **TypeScript** | `.ts`, `.tsx` | interfaces, classes, functions, imports, exports |
| **Python** | `.py`       | classes, functions, decorators, imports |

### ✅ Detección Automática
El analizador **detecta automáticamente** el lenguaje basándose en la extensión del archivo.

### ✅ Salida Unificada
Todos los lenguajes generan el mismo formato JSON estandarizado:

```json
{
  "nodes": [
    {
      "id": "crate::services::audio::AudioService",
      "type": "struct",
      "description": "Handles audio playback",
      "public_methods": ["pub fn new() -> Self"],
      "metadata": {"language": "rust"}
    },
    {
      "id": "packages.core.services.AudioManager",
      "type": "class",
      "public_methods": ["async play(file: string): Promise<void>"],
      "metadata": {"language": "typescript"}
    }
  ],
  "edges": [
    {
      "source": "crate::services::audio::AudioService",
      "target": "tokio::sync::mpsc",
      "label": "uses"
    }
  ]
}
```

---

## 📦 Installation

```bash
cd graph_generator
cargo build --release
```

Binary ubicado en: `target/release/graph_generator`

---

## 🛠️ Usage

### Analizar Proyecto Multi-Lenguaje

```bash
./target/release/graph_generator \
  --path /path/to/project \
  --extensions "rs,ts,tsx,py" \
  --output project_graph.json
```

### Analizar Solo Rust

```bash
./target/release/graph_generator \
  --path /path/to/rust/project \
  --extensions "rs" \
  --output rust_graph.json
```

### Analizar Solo TypeScript

```bash
./target/release/graph_generator \
  --path /path/to/ts/project \
  --extensions "ts,tsx" \
  --output ts_graph.json
```

### Opciones Avanzadas

```bash
./target/release/graph_generator \
  --path /project \
  --extensions "rs,ts,py" \
  --max-lines 5000 \
  --ignore-dirs "target,node_modules,.git,dist,build,__pycache__" \
  --output graph.json \
  --stats \
  --verbose
```

---

## 🔧 CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--path` | Ruta al directorio raíz del proyecto | *required* |
| `--output` | Archivo JSON de salida | `project_graph.json` |
| `--extensions` | Extensiones a analizar (separadas por comas) | `rs,ts,tsx,py` |
| `--max-lines` | Máximo de líneas por archivo | `3000` |
| `--ignore-dirs` | Directorios a ignorar | `target,node_modules,.git,dist,build` |
| `--stats` | Mostrar estadísticas detalladas | `false` |
| `--verbose` | Modo verboso | `false` |

---

## 📊 Output Format

### Node Types

| Type | Rust | TypeScript | Python |
|------|------|------------|--------|
| `module` | ✅ | ✅ | ✅ |
| `struct` | ✅ | ❌ | ❌ |
| `enum` | ✅ | ❌ | ❌ |
| `trait` | ✅ | ❌ | ❌ |
| `interface` | ❌ | ✅ | ❌ |
| `class` | ❌ | ✅ | ✅ |
| `function` | ✅ | ✅ | ✅ |

### Edge Labels

| Label | Description |
|-------|-------------|
| `uses` | Import/use statement |
| `imports` | Import statement (TS/Python) |
| `implements` | Trait/interface implementation |

---

## 🏗️ Architecture

```
src/
├── main.rs                      # CLI entry point
├── types.rs                     # Language enum + GraphNode/GraphEdge
├── file_discovery.rs            # File discovery with language detection
├── ast_analyzer.rs              # Multi-language orchestrator
├── graph_builder.rs             # Graph construction pipeline
├── output.rs                    # JSON serialization
└── language_analyzers/
    ├── mod.rs                   # LanguageAnalyzer trait
    ├── rust_analyzer.rs         # syn-based Rust parser
    ├── typescript_analyzer.rs   # tree-sitter-typescript parser
    └── python_analyzer.rs       # tree-sitter-python parser
```

### Design Principles

1. **Language Agnostic**: `GraphNode` y `GraphEdge` no dependen del lenguaje
2. **Extensible**: Añadir nuevos lenguajes = implementar `LanguageAnalyzer`
3. **Performance**: tree-sitter usa parsing incremental nativo
4. **Type Safety**: Rust strong typing previene errores en runtime

---

## 🧪 Testing

```bash
cargo test
```

Tests incluyen:
- ✅ Unit tests para cada analyzer
- ✅ Integration tests con proyectos reales
- ✅ Edge cases (archivos vacíos, sintaxis errónea, etc.)

---

## 🔍 Example: Analyzing gemini-cli

```bash
./target/release/graph_generator \
  --path /media/seikarii/Nvme/gemini-cli \
  --extensions "ts,tsx,rs,py" \
  --ignore-dirs "target,node_modules,.git,dist,build" \
  --output gemini_cli_graph.json \
  --stats
```

**Output:**
```
🔍 Iniciando descubrimiento en: /media/seikarii/Nvme/gemini-cli
  ✓ packages/core/src/services/AIService.ts (245 líneas, TypeScript)
  ✓ graph_generator/src/main.rs (159 líneas, Rust)
  ✓ scripts/telemetry_utils.py (180 líneas, Python)
  ...

📊 Total ficheros descubiertos: 342

📝 Analizando 342 ficheros...

✅ Grafo construido exitosamente:
   • Nodos: 1,523
   • Aristas: 2,104
   • Ficheros analizados: 338 exitosos, 4 fallidos
```

---

## 🚀 Future Enhancements

- [ ] JavaScript (.js) support
- [ ] Java support
- [ ] C/C++ support
- [ ] Incremental parsing (solo archivos modificados)
- [ ] Parallel analysis (Rayon)
- [ ] Graph visualization (Graphviz/D3.js export)

---

## 📜 License

See main project LICENSE.

---

**Built with ⚡ Rust + tree-sitter for maximum performance.**
