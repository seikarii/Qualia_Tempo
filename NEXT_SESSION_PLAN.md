# 🚀 NEXT SESSION ACTION PLAN
## Backend Recovery - Complete Phase 1 (Final 10%)

**Current Status**: Phase 1 is 90% complete. Foundation infrastructure established.  
**Goal**: Complete Phase 1 and prepare for Phase 2.  
**Estimated Time**: 4-6 hours

---

## 📋 Priority Tasks (In Order)

### 🔴 CRITICAL TASK 1: Update CompositionRoot.py to Use ServiceContainer
**Why Critical**: Enables full container adoption across backend  
**Current State**: CompositionRoot uses manual dictionary (`_services: Dict[str, Any]`)  
**Target State**: CompositionRoot delegates to ServiceContainer

**Steps**:
1. Read `/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/CompositionRoot.py`
2. Import ServiceContainer and container_config
3. Replace `self._services = {}` with `self.container = get_configured_container()`
4. Update `get_service(name: str)` to use `container.resolve(interface)`
5. Update all service registration calls to use container methods
6. Run architectural linter: `./scripts/lint-architecture.sh`
7. Fix any violations detected

**Expected Outcome**: All backend code uses ServiceContainer for dependency resolution

---

### 🟡 HIGH PRIORITY TASK 2: Migrate Remaining Core Services (4 services)
**Why Important**: Establishes pattern consistency, eliminates direct logging calls  
**Target Services**:
1. FileSystemService
2. SystemEnvironmentService  
3. SecurityService
4. ShaderIntrospectionService

**Migration Pattern (Per Service)**:
```python
# BEFORE:
class MyService:
    def __init__(self):
        self._logger = logging.getLogger(__name__)

# AFTER:
class MyService:
    def __init__(self, config: MyServiceConfig, logger: ILogger):
        self._config = config
        self._logger = logger
```

**Steps Per Service**:
1. Read service file
2. Update constructor signature to accept `config: ServiceConfig` and `logger: ILogger`
3. Replace `self._logger = logging.getLogger(__name__)` with `self._logger = logger`
4. Move hardcoded values to config object
5. Ensure service is registered in `container_config.py`
6. Run tests: `pytest backend/tests/test_[service_name].py`
7. Run architectural linter after all 4 migrations

**Expected Outcome**: 40% → 100% logger injection coverage

---

### 🟢 MEDIUM PRIORITY TASK 3: Implement ConfigurationService
**Why Important**: Enables YAML-based config loading (replaces hardcoded defaults)  
**Current State**: `container_config.py` has hardcoded config objects  
**Target State**: ConfigurationService loads configs from YAML files

**Steps**:
1. Read `backend/services/interfaces/IConfigurationService.py`
2. Implement `ConfigurationService` in `backend/services/ConfigurationService.py`
3. Add method: `load_config(config_type: Type[T], filename: str) -> T`
4. Load YAML files from `backend/config/` directory
5. Parse YAML into typed dataclass instances
6. Update `container_config.py` to use ConfigurationService
7. Add tests in `backend/tests/test_configuration_service.py`

**Expected Outcome**: All configs loaded from YAML, zero hardcoding

---

### 🟢 MEDIUM PRIORITY TASK 4: Fix Test File Violations
**Why Important**: Achieves 0 architectural violations in backend  
**Current State**: 3-4 test files use direct instantiation  
**Target State**: All tests use TestCompositionRootFactory or container

**Steps**:
1. Identify test files with violations: `./scripts/lint-architecture.sh | grep test_`
2. For each test file:
   - Replace `service = MyService()` with `service = container.resolve(IMyService)`
   - Use `TestCompositionRootFactory.create_mocked_composition_root()`
3. Run full test suite: `pytest backend/tests/`
4. Run architectural linter to verify 0 violations

**Expected Outcome**: 0 architectural violations in backend

---

## 🎯 Success Criteria for Phase 1 Completion

- [x] Interface coverage: 100% (COMPLETE)
- [x] Contract coverage: 100% (COMPLETE)  
- [x] IoC container: Functional (COMPLETE)
- [x] Logger service: Implemented (COMPLETE)
- [ ] CompositionRoot: Uses ServiceContainer (PENDING)
- [ ] Service migration: 100% (currently 40%)
- [ ] ConfigurationService: Implemented (PENDING)
- [ ] Architectural violations: 0 in core services (currently 6)

---

## 📚 Reference Documents

**MUST READ BEFORE STARTING**:
1. `/media/seikarii/Nvme/QualiaTempo/docs/QUALIA.CODE.md` - Architectural law
2. `/media/seikarii/Nvme/QualiaTempo/docs/QUALIA.MANUAL.md` - Implementation patterns
3. `/media/seikarii/Nvme/QualiaTempo/docs/reports/BACKEND_PHASE1_SUMMARY.md` - Phase 1 summary
4. `/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/README.md` - Backend docs

**Reference Files**:
- `backend/services/EventBus.py` - Example of migrated service
- `backend/services/QualiaProcessor.py` - Example of migrated service
- `backend/services/container.py` - ServiceContainer implementation
- `backend/services/container_config.py` - Service registration

---

## 🔧 Tools & Commands

**Architectural Linter** (run after each task):
```bash
cd /media/seikarii/Nvme/QualiaTempo && ./scripts/lint-architecture.sh
```

**Backend Tests** (run after service migrations):
```bash
cd /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend
source /media/seikarii/Nvme/QualiaTempo/.venv/bin/activate
pytest tests/ -v
```

**Python Virtual Environment** (activate before Python commands):
```bash
source /media/seikarii/Nvme/QualiaTempo/.venv/bin/activate
```

---

## 🚨 Critical Reminders

1. **ALWAYS** use Sequential Thinking for complex tasks
2. **ALWAYS** run architectural linter after modifications
3. **NEVER** commit code with architectural violations
4. **NEVER** skip reading QUALIA.CODE.md and QUALIA.MANUAL.md
5. **UPDATE** `TODO.md` when adding/removing TODOs
6. **UPDATE** `CHANGELOG.md` at end of session
7. **UPDATE** `backendrecovery.md` progress tracking

---

## 🎉 After Phase 1 Completion

**Phase 2 Preview**: Decorator System Enhancement
- Separate decorators into individual files
- Implement @OnEvent decorator for automatic event subscription
- Implement @AdaptAndEmit decorator for protocol adaptation
- Implement @throttle, @retry, @timeout decorators
- Create ApplicationInitializerService for lifecycle management

**Estimated Phase 2 Duration**: 6-8 hours

---

## 📊 Current Phase 1 Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Interface Coverage | 100% | 100% | ✅ COMPLETE |
| Contract Coverage | 100% | 100% | ✅ COMPLETE |
| Logger Injection | 40% | 100% | ⏳ IN PROGRESS |
| CompositionRoot Migration | 0% | 100% | ⏸️ PENDING |
| Config Service | 0% | 100% | ⏸️ PENDING |
| Architectural Violations | 6 | 0 | ⏳ IN PROGRESS |
| **Overall Phase 1** | **90%** | **100%** | **⏳ 10% REMAINING** |

---

**Last Updated**: 2025-01-08  
**Next Review**: After CompositionRoot migration  
**Contact**: @seikarii for questions
