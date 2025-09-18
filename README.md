# Qualia Tempo - Prototype

**A Charlie Hellsinger Story**

Un juego de ritmo donde el rendimiento del jugador genera efectos visuales procedurales en tiempo real a través del revolucionario sistema **QualiaState**.

## 🎯 Prototipo Vertical - Fase 1

Este prototipo demuestra:
- ✅ Comunicación Frontend-Backend funcional
- ✅ Sistema QualiaState reactivo
- ✅ Motor visual básico con shaders GLSL
- ✅ UI de debug para monitorear el estado
- ✅ Arquitectura escalable para desarrollo futuro

## 🏗️ Arquitectura

### Backend (Python/FastAPI)
- **Motor Visual**: Recibe `QualiaState` y genera efectos visuales
- **Endpoint**: `POST /update_qualia` - Comunicación con frontend
- **Shaders**: GLSL vertex/fragment shaders que reaccionan al estado del jugador

### Frontend (TypeScript/React/Electron)
- **Motor de Juego**: Lógica de gameplay, ritmo y combos
- **QualiaState Calculator**: Traduce acciones del jugador en estado visual
- **UI**: HUD con información de debug y subtítulos

## 🚀 Setup Rápido

### Prerrequisitos
- Python 3.8+
- Node.js 16+
- npm o yarn

### 1. Crear Entorno Virtual (Python)
```bash
python3 -m venv .venv
```

### 2. Backend
```bash
source .venv/bin/activate  # Activar entorno virtual
cd backend
pip install -r requirements.txt
python main.py
```
El backend estará disponible en: `http://localhost:8000`

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
El frontend estará disponible en: `http://localhost:5173`

### 4. Verificar Conexión
Abre el frontend y deberías ver:
- ✅ "Backend Connected" en la pantalla principal
- 🔥 Los logs del backend mostrando datos de QualiaState cuando interactúes

### 5. Verificar Funcionalidad del Botón "Start The First Duel"

Después de la corrección del bug de inicialización de servicios:

1. **Iniciar el Sistema**:
   ```bash
   ./start.sh
   ```

2. **Verificar Servicios**:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000
   - API Docs: http://localhost:8000/docs

3. **Probar el Botón**:
   - Abre http://localhost:5173 en tu navegador
   - Busca el botón "Start The First Duel"
   - Haz clic en el botón
   - **Comportamiento Esperado**:
     - ✅ La página debe cambiar a la pantalla de juego
     - ✅ No deben aparecer errores de JavaScript en la consola
     - ✅ El backend debe recibir eventos PlayerAction
     - ✅ GameControllerService debe procesar el evento StartGame

4. **Verificación Automática**:
   ```bash
   ./test-button-functionality.sh
   ```

5. **Debug Manual**:
   - **Consola del navegador**: Busca logs de GameControllerService
   - **Logs del backend**: Verifica recepción de eventos PlayerAction
   - **Network tab**: Confirma comunicación frontend-backend

**Estado del Bug**: ✅ **CORREGIDO** - GameControllerService ahora se inicializa correctamente durante el startup de la aplicación.

## 🎮 Controles (Placeholder)

- **WASD**: Movimiento rítmico
- **SPACE**: Habilidad Pause
- **ESC**: Reset del juego
- **F11**: Pantalla completa (Electron)

## 📊 Sistema QualiaState

El `QualiaState` es el corazón del sistema visual:

```typescript
interface QualiaState {
  intensity: number;    // Energía general (0-1)
  precision: number;    // Precisión del jugador (0-1)
  aggression: number;   // Agresividad en combos (0-1)
  flow: number;         // Fluidez rítmica (0-1)
  chaos: number;        // Caos por errores (0-1)
  recovery: number;     // Estado de recuperación (0-1)
  transcendence: number; // Modo Ultimate (0-1)
}
```

### Efectos Visuales por Estado:
- **Flow > 0.7**: Patrones armónicos azul-cyan
- **Precision > 0.8**: Cristales blancos/plateados ordenados
- **Aggression > 0.3**: Partículas rojas/naranjas violentas
- **Chaos > 0.3**: Colores cambiantes caóticos
- **Transcendence = 1**: Modo 8D - distorsión completa de la realidad

## 🔧 Configuración

### Backend (`backend/main.py`)
- Puerto: 8000
- CORS habilitado para desarrollo
- Logs detallados de QualiaState

### Frontend (`frontend/src/config/gameConfig.ts`)
- Tolerancia de ritmo: 150ms
- Frecuencia de actualización visual: 100ms
- Modo debug: Habilitado

## 📁 Estructura del Proyecto

```
qualia-tempo-prototype/
├── backend/
│   ├── api/routes.py           # FastAPI endpoints
│   ├── engine/particle_system.py # Motor visual
│   └── engine/shaders/         # Shaders GLSL
├── frontend/
│   ├── src/
│   │   ├── components/         # UI React
│   │   ├── gameplay/           # Lógica de juego
│   │   ├── services/           # Comunicación API
│   │   └── state/              # Gestión de estado (Zustand)
└── combat_data/
    └── the_first_duel.json     # Datos del combate
```

## 🐛 Debug y Testing

### Verificar Comunicación Backend:
```bash
curl -X POST http://localhost:8000/update_qualia \
  -H "Content-Type: application/json" \
  -d '{"intensity":0.8,"precision":0.5,"aggression":0.7,"flow":0.9,"chaos":0.1,"recovery":0.0,"transcendence":0.0}'
```

### Logs Importantes:
- **Backend**: Muestra valores de QualiaState recibidos
- **Frontend**: Consola del navegador con eventos de gameplay
- **API**: Documentación automática en `http://localhost:8000/docs`

## 🎯 Próximos Pasos (Fases 2-5)

1. **Fase 2**: Implementar movimiento del jugador y carga de audio
2. **Fase 3**: Sistema de ritmo y combos funcional
3. **Fase 4**: Integración completa visual-audio
4. **Fase 5**: Pulido, habilidades y efectos finales

## 🏆 Objetivo Final

Crear una demo de 60 segundos que muestre:
- Un combate de boss completo
- Efectos visuales espectaculares reactivos al gameplay
- Sistema de subtítulos sincronizado
- Mecánicas de ritmo fluidas y precisas

---

**Status del Prototipo**: ✅ Fase 1 Completa - Comunicación establecida

*"La música es el lenguaje del alma. Los visuales son su manifestación."*
