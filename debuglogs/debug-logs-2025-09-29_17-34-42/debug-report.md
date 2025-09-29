# Qualia Tempo Debug Report
**Generated:** lun 29 sep 2025 17:34:42 CEST
**Session:** 2025-09-29_17-34-42

## System Information
- **Project Root:** /media/seikarii/Nvme/QualiaTempo
- **Python Virtual Env:** /media/seikarii/Nvme/QualiaTempo/.venv
- **Backend Dir:** /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend
- **Frontend Dir:** /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend

## Debug Session Log
[0;34m[INFO][0m Debug environment initialized
[0;34m[INFO][0m Logs will be saved to: /media/seikarii/Nvme/QualiaTempo/debuglogs/debug-logs-2025-09-29_17-34-42
[0;34m[INFO][0m Checking system health...
[0;32m[SUCCESS][0m System health check passed
[0;34m[INFO][0m Setting up environment...
[0;36m[DEBUG][0m Virtual environment activated: /media/seikarii/Nvme/QualiaTempo/.venv
[0;34m[INFO][0m Installing backend dependencies...
Requirement already satisfied: fastapi==0.116.1 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 1)) (0.116.1)
Requirement already satisfied: uvicorn==0.27.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 2)) (0.27.0)
Requirement already satisfied: pydantic==2.6.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 3)) (2.6.0)
Requirement already satisfied: python-multipart==0.0.9 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 4)) (0.0.9)
Requirement already satisfied: moderngl==5.8.2 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 5)) (5.8.2)
Requirement already satisfied: pyrr==0.10.3 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 6)) (0.10.3)
Requirement already satisfied: pygame==2.5.2 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 7)) (2.5.2)
Requirement already satisfied: numpy>=1.26.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 8)) (2.3.2)
Requirement already satisfied: jsonschema>=4.17.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 11)) (4.25.1)
Requirement already satisfied: datamodel-code-generator>=0.33.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 12)) (0.33.0)
Requirement already satisfied: black>=23.0.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 15)) (25.1.0)
Requirement already satisfied: ruff>=0.1.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 16)) (0.12.12)
Requirement already satisfied: mypy>=1.0.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 17)) (1.17.1)
Requirement already satisfied: types-jsonschema>=4.19.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 18)) (4.25.1.20250822)
Requirement already satisfied: types-PyYAML>=6.0.12 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 19)) (6.0.12.20250915)
Requirement already satisfied: pytest>=7.0.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 20)) (8.4.2)
Requirement already satisfied: pytest-asyncio>=0.21.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 21)) (1.1.0)
Requirement already satisfied: pytest-cov>=4.0.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 22)) (6.3.0)
Requirement already satisfied: httpx==0.28.1 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 23)) (0.28.1)
Requirement already satisfied: aiofiles>=0.23.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 26)) (24.1.0)
Requirement already satisfied: python-jose>=3.3.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from python-jose[cryptography]>=3.3.0->-r requirements.txt (line 27)) (3.5.0)
Requirement already satisfied: passlib>=1.7.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from passlib[bcrypt]>=1.7.0->-r requirements.txt (line 28)) (1.7.4)
Requirement already satisfied: starlette==0.47.3 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from -r requirements.txt (line 31)) (0.47.3)
Requirement already satisfied: typing-extensions>=4.8.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from fastapi==0.116.1->-r requirements.txt (line 1)) (4.15.0)
Requirement already satisfied: annotated-types>=0.4.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from pydantic==2.6.0->-r requirements.txt (line 3)) (0.7.0)
Requirement already satisfied: pydantic-core==2.16.1 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from pydantic==2.6.0->-r requirements.txt (line 3)) (2.16.1)
Requirement already satisfied: anyio<5,>=3.6.2 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from starlette==0.47.3->-r requirements.txt (line 31)) (3.7.1)
Requirement already satisfied: click>=7.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from uvicorn==0.27.0->-r requirements.txt (line 2)) (8.2.1)
Requirement already satisfied: h11>=0.8 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from uvicorn==0.27.0->-r requirements.txt (line 2)) (0.16.0)
Requirement already satisfied: glcontext<3,>=2.3.6 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from moderngl==5.8.2->-r requirements.txt (line 5)) (2.5.0)
Requirement already satisfied: multipledispatch in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from pyrr==0.10.3->-r requirements.txt (line 6)) (1.0.0)
Requirement already satisfied: certifi in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from httpx==0.28.1->-r requirements.txt (line 23)) (2025.8.3)
Requirement already satisfied: httpcore==1.* in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from httpx==0.28.1->-r requirements.txt (line 23)) (1.0.9)
Requirement already satisfied: idna in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from httpx==0.28.1->-r requirements.txt (line 23)) (3.10)
Requirement already satisfied: sniffio>=1.1 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from anyio<5,>=3.6.2->starlette==0.47.3->-r requirements.txt (line 31)) (1.3.1)
Requirement already satisfied: attrs>=22.2.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from jsonschema>=4.17.0->-r requirements.txt (line 11)) (25.3.0)
Requirement already satisfied: jsonschema-specifications>=2023.03.6 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from jsonschema>=4.17.0->-r requirements.txt (line 11)) (2025.9.1)
Requirement already satisfied: referencing>=0.28.4 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from jsonschema>=4.17.0->-r requirements.txt (line 11)) (0.36.2)
Requirement already satisfied: rpds-py>=0.7.1 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from jsonschema>=4.17.0->-r requirements.txt (line 11)) (0.27.1)
Requirement already satisfied: argcomplete<4,>=2.10.1 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from datamodel-code-generator>=0.33.0->-r requirements.txt (line 12)) (3.6.2)
Requirement already satisfied: genson<2,>=1.2.1 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from datamodel-code-generator>=0.33.0->-r requirements.txt (line 12)) (1.3.0)
Requirement already satisfied: inflect<8,>=4.1 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from datamodel-code-generator>=0.33.0->-r requirements.txt (line 12)) (5.6.2)
Requirement already satisfied: isort<7,>=4.3.21 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from datamodel-code-generator>=0.33.0->-r requirements.txt (line 12)) (5.13.2)
Requirement already satisfied: jinja2<4,>=2.10.1 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from datamodel-code-generator>=0.33.0->-r requirements.txt (line 12)) (3.1.6)
Requirement already satisfied: packaging in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from datamodel-code-generator>=0.33.0->-r requirements.txt (line 12)) (25.0)
Requirement already satisfied: pyyaml>=6.0.1 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from datamodel-code-generator>=0.33.0->-r requirements.txt (line 12)) (6.0.2)
Requirement already satisfied: MarkupSafe>=2.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from jinja2<4,>=2.10.1->datamodel-code-generator>=0.33.0->-r requirements.txt (line 12)) (3.0.2)
Requirement already satisfied: mypy-extensions>=0.4.3 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from black>=23.0.0->-r requirements.txt (line 15)) (1.1.0)
Requirement already satisfied: pathspec>=0.9.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from black>=23.0.0->-r requirements.txt (line 15)) (0.12.1)
Requirement already satisfied: platformdirs>=2 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from black>=23.0.0->-r requirements.txt (line 15)) (4.4.0)
Requirement already satisfied: iniconfig>=1 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from pytest>=7.0.0->-r requirements.txt (line 20)) (2.1.0)
Requirement already satisfied: pluggy<2,>=1.5 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from pytest>=7.0.0->-r requirements.txt (line 20)) (1.6.0)
Requirement already satisfied: pygments>=2.7.2 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from pytest>=7.0.0->-r requirements.txt (line 20)) (2.19.2)
Requirement already satisfied: coverage>=7.5 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from coverage[toml]>=7.5->pytest-cov>=4.0.0->-r requirements.txt (line 22)) (7.10.6)
Requirement already satisfied: ecdsa!=0.15 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from python-jose>=3.3.0->python-jose[cryptography]>=3.3.0->-r requirements.txt (line 27)) (0.19.1)
Requirement already satisfied: rsa!=4.1.1,!=4.4,<5.0,>=4.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from python-jose>=3.3.0->python-jose[cryptography]>=3.3.0->-r requirements.txt (line 27)) (4.9.1)
Requirement already satisfied: pyasn1>=0.5.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from python-jose>=3.3.0->python-jose[cryptography]>=3.3.0->-r requirements.txt (line 27)) (0.6.1)
Requirement already satisfied: six>=1.9.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from ecdsa!=0.15->python-jose>=3.3.0->python-jose[cryptography]>=3.3.0->-r requirements.txt (line 27)) (1.17.0)
Requirement already satisfied: bcrypt>=3.1.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from passlib[bcrypt]>=1.7.0->-r requirements.txt (line 28)) (4.3.0)
Requirement already satisfied: cryptography>=3.4.0 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from python-jose[cryptography]>=3.3.0->-r requirements.txt (line 27)) (45.0.7)
Requirement already satisfied: cffi>=1.14 in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from cryptography>=3.4.0->python-jose[cryptography]>=3.3.0->-r requirements.txt (line 27)) (1.17.1)
Requirement already satisfied: pycparser in /media/seikarii/Nvme/QualiaTempo/.venv/lib/python3.12/site-packages (from cffi>=1.14->cryptography>=3.4.0->python-jose[cryptography]>=3.3.0->-r requirements.txt (line 27)) (2.22)
[0;34m[INFO][0m Installing frontend dependencies...

added 20 packages, and audited 1253 packages in 3s

187 packages are looking for funding
  run `npm fund` for details

3 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
[0;32m[SUCCESS][0m Environment setup complete
[0;34m[INFO][0m Cleaning up existing processes...
[0;32m[SUCCESS][0m Existing processes cleaned up
[0;34m[INFO][0m Starting backend server...
[0;36m[DEBUG][0m Backend PID: 332534
[0;34m[INFO][0m Waiting for backend to be ready...
[0;32m[SUCCESS][0m Backend is ready (http://localhost:8000)
[0;34m[INFO][0m Starting frontend server...
[0;36m[DEBUG][0m Frontend PID: 332601
[0;34m[INFO][0m Waiting for frontend to be ready...
[0;32m[SUCCESS][0m Frontend is ready (http://localhost:5173)
[0;32m[SUCCESS][0m Both services are running!
[0;34m[INFO][0m Entering browser testing phase...
[0;34m[INFO][0m Purging stale artifacts from working directory...
[0;32m[SUCCESS][0m Working directory is clean.
[0;34m[INFO][0m Generating dynamic browser test script with enhanced failure reporting...
[0;32m[SUCCESS][0m Dynamic browser test script generated.
[0;34m[INFO][0m Executing browser test... (Errors are expected during failure tests)
[0;34m[INFO][0m Browser test execution finished.
[0;34m[INFO][0m Archiving all generated artifacts to /media/seikarii/Nvme/QualiaTempo/debuglogs/debug-logs-2025-09-29_17-34-42...
[0;32m[SUCCESS][0m Artifact archiving complete. All generated files have been moved.
[0;34m[INFO][0m Debug test completed, auto-terminating...
[0;34m[INFO][0m Cleaning up debug session...
[0;34m[INFO][0m Stopping backend (PID: 332534)...
[0;34m[INFO][0m Stopping frontend (PID: 332601)...
[0;34m[INFO][0m Generating comprehensive debug report...

## Backend Status
❌ Not running

## Frontend Status  
❌ Not running

## Log Files Generated
- Backend Log: `/media/seikarii/Nvme/QualiaTempo/debuglogs/debug-logs-2025-09-29_17-34-42/backend.log`
- Frontend Log: `/media/seikarii/Nvme/QualiaTempo/debuglogs/debug-logs-2025-09-29_17-34-42/frontend.log`
- Browser Console Log: `/media/seikarii/Nvme/QualiaTempo/debuglogs/debug-logs-2025-09-29_17-34-42/browser-console.log`

## Recent Backend Log (last 20 lines)
```
2025-09-29 17:35:08,615 - backend.services.StreamingWebService - INFO - Streaming is already stopped.
2025-09-29 17:35:08,615 - backend.services.StreamingWebService - INFO - ✅ StreamingWebService shutdown complete.
2025-09-29 17:35:08,615 - backend.CompositionRoot - CRITICAL - ✅ streaming_web_service TERMINATED.
2025-09-29 17:35:08,615 - backend.CompositionRoot - INFO - 🛑 Shutting down qualia_processor...
2025-09-29 17:35:08,615 - backend.services.QualiaProcessor - INFO - 🛑 Shutting down QualiaProcessor...
2025-09-29 17:35:08,615 - backend.CompositionRoot - CRITICAL - ✅ qualia_processor TERMINATED.
2025-09-29 17:35:08,615 - backend.CompositionRoot - INFO - 🛑 Shutting down particle_system...
2025-09-29 17:35:08,615 - backend.engine.qualia_particle_engine - INFO - → ENTER backend.engine.qualia_particle_engine.QualiaParticleEngine.shutdown
2025-09-29 17:35:08,615 - backend.engine.qualia_particle_engine - INFO - ← EXIT backend.engine.qualia_particle_engine.QualiaParticleEngine.shutdown (⏱️ 0.000s)
2025-09-29 17:35:08,615 - backend.engine.qualia_particle_engine - INFO - → ENTER backend.engine.qualia_particle_engine.QualiaParticleEngine._stop_autonomous_simulation
2025-09-29 17:35:08,615 - backend.engine.qualia_particle_engine - INFO - ← EXIT backend.engine.qualia_particle_engine.QualiaParticleEngine._stop_autonomous_simulation (⏱️ 0.000s)
2025-09-29 17:35:08,616 - backend.engine.qualia_particle_engine - INFO - 🛑 Autonomous simulation loop cancelled
2025-09-29 17:35:08,616 - backend.engine.qualia_particle_engine - INFO - 🛑 Autonomous simulation loop terminated
2025-09-29 17:35:08,616 - backend.engine.qualia_particle_engine - INFO - ✅ Autonomous simulation loop cancelled
2025-09-29 17:35:08,616 - backend.engine.qualia_particle_engine - INFO - ✅ QualiaParticleEngine shutdown complete
2025-09-29 17:35:08,616 - backend.CompositionRoot - CRITICAL - ✅ particle_system TERMINATED.
2025-09-29 17:35:08,616 - backend.CompositionRoot - CRITICAL - 💀 ALL SERVICES TERMINATED. CompositionRoot shutdown is complete.
2025-09-29 17:35:08,616 - backend.api.routes - INFO - ✅ All services terminated gracefully.
INFO:     Application shutdown complete.
INFO:     Finished server process [332534]
```

## Recent Frontend Log (last 20 lines)
```

  VITE v5.4.20  ready in 235 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
17:34:52 [vite] warning: The "??" operator here will always return the left operand
738|        // Check for extreme values
739|        Object.entries(this.lastQualiaState).forEach(([key, value]) => {
740|          if (typeof value === "number" && (value < 0 ?? value > 1)) {
   |                                                      ^
741|            results.push({
742|              type: "state_anomaly",

  Plugin: vite:esbuild
  File: /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/DebugService.ts
17:34:56 [vite] page reload browser-test.js
17:34:56 [vite] page reload browser-test-failure.json
17:34:56 [vite] page reload debug-page-content-FAILURE.html
17:35:08 [vite] page reload debug-page-content-FAILURE.html
17:35:08 [vite] page reload browser-test-failure.json
```

## Browser Test Results
[0;32m[SUCCESS][0m Debug report generated: /media/seikarii/Nvme/QualiaTempo/debuglogs/debug-logs-2025-09-29_17-34-42/debug-report.md
[0;32m[SUCCESS][0m 🔍 DEBUG SESSION COMPLETE
