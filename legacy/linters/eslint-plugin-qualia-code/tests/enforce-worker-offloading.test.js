/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Tests for: enforce-worker-offloading
 * 
 * Validates that the rule correctly identifies CPU-intensive methods
 * that should be offloaded to Web Workers.
 * 
 * This rule is stricter than enforce-async-on-heavy-methods and targets
 * methods that are TOO heavy even for async and should use Workers.
 */

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-worker-offloading');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      decorators: true,
      classes: true
    }
  }
});

ruleTester.run('enforce-worker-offloading', rule, {
  valid: [
    // ✅ VALID: Method already uses Workers
    {
      code: `
        class ParticleSystemService {
          public updateParticles(particles: Particle[]): void {
            const worker = new Worker('./particle-worker.js');
            worker.postMessage(particles);
          }
        }
      `,
      filename: 'src/services/ParticleSystemService.ts'
    },

    // ✅ VALID: Method uses workerService
    {
      code: `
        class CalculationEngine {
          public calculateState(data: number[][]): void {
            this.workerService.execute('calculateState', data);
          }
        }
      `,
      filename: 'src/services/CalculationEngine.ts'
    },

    // ✅ VALID: Method has Worker exemption comment
    {
      code: `
        class OptimizedProcessor {
          // WORKER-EXEMPT: Already optimized for main thread
          public processData(items: Item[]): void {
            for (let i = 0; i < items.length; i++) {
              for (let j = 0; j < items[i].vertices.length; j++) {
                items[i].vertices[j] *= 2;
              }
            }
          }
        }
      `,
      filename: 'src/services/OptimizedProcessor.ts'
    },

    // ✅ VALID: Test file (exempted)
    {
      code: `
        describe('ParticleSystem', () => {
          it('processes particles', () => {
            const particles = [];
            for (let i = 0; i < 1000; i++) {
              for (let j = 0; j < 1000; j++) {
                particles.push({ x: i, y: j });
              }
            }
          });
        });
      `,
      filename: 'src/services/__tests__/ParticleSystem.test.ts'
    },

    // ✅ VALID: Private method (internal decision)
    {
      code: `
        class InternalEngine {
          private _internalProcessing(data: number[][]): void {
            for (let i = 0; i < data.length; i++) {
              for (let j = 0; j < data[i].length; j++) {
                data[i][j] = Math.sqrt(data[i][j]);
              }
            }
          }
        }
      `,
      filename: 'src/services/InternalEngine.ts'
    },

    // ✅ VALID: Simple method without heavy computation indicators
    {
      code: `
        class SimpleService {
          public getData(): Data {
            return this.data;
          }
        }
      `,
      filename: 'src/services/SimpleService.ts'
    },

    // ✅ VALID: Method with only ONE heavy indicator (needs >= 2)
    {
      code: `
        class LightCalculator {
          public calculate(x: number): number {
            return Math.sqrt(x * x + 1);
          }
        }
      `,
      filename: 'src/services/LightCalculator.ts'
    },

    // ✅ VALID: Method with @worker decorator
    {
      code: `
        class ProcessorService {
          @worker
          public processHeavy(data: number[][]): void {
            for (let i = 0; i < data.length; i++) {
              for (let j = 0; j < data[i].length; j++) {
                data[i][j] = Math.pow(data[i][j], 2);
              }
            }
          }
        }
      `,
      filename: 'src/services/ProcessorService.ts'
    },

    // ✅ VALID: Async method (async methods exempt because they yield control)
    {
      code: `
        class AsyncProcessor {
          public async processParticles(particles: Particle[]): Promise<void> {
            for (let i = 0; i < particles.length; i++) {
              for (let j = 0; j < particles[i].vertices.length; j++) {
                particles[i].vertices[j].update();
              }
            }
          }
        }
      `,
      filename: 'src/services/AsyncProcessor.ts'
    },

    // ✅ VALID: Getter method (always exempt)
    {
      code: `
        class DataProvider {
          public get particles(): Particle[] {
            return this.items.map(item => item.particle).filter(p => p.active);
          }
        }
      `,
      filename: 'src/services/DataProvider.ts'
    }
  ],

  invalid: [
    // ❌ INVALID: Nested loops on particles (CRITICAL)
    {
      code: `
        class ParticleEngine {
          public updateParticles(particles: Particle[]): void {
            for (let i = 0; i < particles.length; i++) {
              for (let j = 0; j < particles[i].vertices.length; j++) {
                particles[i].vertices[j].x += 1;
              }
            }
          }
        }
      `,
      filename: 'src/services/ParticleEngine.ts',
      errors: [{
        messageId: 'needsWorker',
        type: 'MethodDefinition'
      }]
    },

    // ❌ INVALID: Multiple bulk array operations + heavy math
    {
      code: `
        class PhysicsCalculator {
          public calculateForces(entities: Entity[]): void {
            const forces = entities.map(e => e.velocity);
            const normalized = forces.map(f => Math.sqrt(f.x * f.x + f.y * f.y));
            const scaled = normalized.map(n => Math.pow(n, 2));
          }
        }
      `,
      filename: 'src/services/PhysicsCalculator.ts',
      errors: [{
        messageId: 'needsWorker',
        type: 'MethodDefinition'
      }]
    },

    // ❌ INVALID: Heavy method name + bulk data + math operations
    {
      code: `
        class StateSimulator {
          public simulatePhysics(nodes: PhysicsNode[]): void {
            nodes.forEach(node => {
              node.position.x = Math.sin(node.angle) * node.velocity;
              node.position.y = Math.cos(node.angle) * node.velocity;
            });
          }
        }
      `,
      filename: 'src/services/StateSimulator.ts',
      errors: [{
        messageId: 'considerWorker',
        type: 'MethodDefinition'
      }]
    },

    // ❌ INVALID: Heavy class (Engine) + heavy method name (calculate) + math
    {
      code: `
        class RenderingEngine {
          public calculateTransforms(vertices: Vector3[]): void {
            for (let i = 0; i < vertices.length; i++) {
              vertices[i].x = Math.cos(vertices[i].angle) * vertices[i].distance;
            }
          }
        }
      `,
      filename: 'src/services/RenderingEngine.ts',
      errors: [{
        messageId: 'considerWorker',
        type: 'MethodDefinition'
      }]
    },

    // ❌ INVALID: Nested loops + heavy math (5+ math ops) = CRITICAL
    {
      code: `
        class ComplexProcessor {
          public process(data: number[][]): void {
            for (let i = 0; i < data.length; i++) {
              for (let j = 0; j < data[i].length; j++) {
                const val = data[i][j];
                data[i][j] = Math.sqrt(Math.pow(val, 2) + Math.sin(val) + Math.cos(val) + Math.exp(val));
              }
            }
          }
        }
      `,
      filename: 'src/services/ComplexProcessor.ts',
      errors: [{
        messageId: 'needsWorker',
        type: 'MethodDefinition'
      }]
    },

    // ❌ INVALID: Function declaration (not class method) with heavy computation
    {
      code: `
        export function processParticleBuffer(particles: Particle[], buffer: Float32Array): void {
          for (let i = 0; i < particles.length; i++) {
            for (let j = 0; j < 3; j++) {
              buffer[i * 3 + j] = Math.pow(particles[i].position[j], 2);
            }
          }
        }
      `,
      filename: 'src/utils/particleUtils.ts',
      errors: [{
        messageId: 'needsWorker',
        type: 'FunctionDeclaration'
      }]
    },

    // ❌ INVALID: Multiple array operations (3+) on bulk data = CRITICAL
    {
      code: `
        class DataTransformer {
          public transformEntities(entities: Entity[]): void {
            const mapped = entities.map(e => e.data);
            const filtered = mapped.filter(d => d.active);
            const sorted = filtered.sort((a, b) => a.priority - b.priority);
            const reduced = sorted.reduce((acc, d) => acc + d.value, 0);
          }
        }
      `,
      filename: 'src/services/DataTransformer.ts',
      errors: [{
        messageId: 'needsWorker',
        type: 'MethodDefinition'
      }]
    },

    // ❌ INVALID: Heavy computation service class + calculate method + bulk data
    {
      code: `
        class QualiaStateCalculatorService {
          public calculateQualiaState(state: GameState): QualiaState {
            const particles = state.particles.map(p => p.position);
            return particles.reduce((acc, pos) => acc + Math.sqrt(pos.x * pos.x), 0);
          }
        }
      `,
      filename: 'src/services/QualiaStateCalculatorService.ts',
      errors: [{
        messageId: 'considerWorker',
        type: 'MethodDefinition'
      }]
    },

    // ❌ INVALID: Processor class + bulk transformation
    {
      code: `
        class AudioProcessor {
          public processBuffer(buffer: Float32Array): void {
            for (let i = 0; i < buffer.length; i++) {
              buffer[i] = Math.sin(buffer[i] * Math.PI * 2);
            }
          }
        }
      `,
      filename: 'src/services/AudioProcessor.ts',
      errors: [{
        messageId: 'considerWorker',
        type: 'MethodDefinition'
      }]
    },

    // ❌ INVALID: Complex nested structure processing
    {
      code: `
        class SceneGraphProcessor {
          public updateNodes(nodes: SceneNode[]): void {
            for (let i = 0; i < nodes.length; i++) {
              const node = nodes[i];
              for (let j = 0; j < node.children.length; j++) {
                node.children[j].transform = Math.cos(node.rotation) * Math.sin(node.scale);
              }
            }
          }
        }
      `,
      filename: 'src/services/SceneGraphProcessor.ts',
      errors: [{
        messageId: 'needsWorker',
        type: 'MethodDefinition'
      }]
    }
  ]
});

console.log('✅ All enforce-worker-offloading tests passed!');
