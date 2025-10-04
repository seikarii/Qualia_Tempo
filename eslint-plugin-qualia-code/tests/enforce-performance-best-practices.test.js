/**
 * @fileoverview Tests for enforce-performance-best-practices rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-performance-best-practices');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      experimentalDecorators: true
    }
  }
});

ruleTester.run('enforce-performance-best-practices', rule, {
  valid: [
    // addEventListener with throttled handler
    {
      code: `
        class BrowserService {
          public initialize(): void {
            window.addEventListener('resize', throttle(() => {
              this.handleResize();
            }, 250));
          }
        }
      `,
      filename: 'src/services/BrowserService.ts'
    },
    // Method with @throttle decorator for high-frequency event
    {
      code: `
        class EventService {
          @throttle(100)
          private handleScroll(event: Event): void {
            this.updatePosition();
          }
          
          public initialize(): void {
            window.addEventListener('scroll', this.handleScroll.bind(this));
          }
        }
      `,
      filename: 'src/services/EventService.ts'
    },
    // Non-high-frequency event (no throttle needed)
    {
      code: `
        class ClickService {
          public initialize(): void {
            button.addEventListener('click', () => {
              this.handleClick();
            });
          }
        }
      `,
      filename: 'src/services/ClickService.ts'
    },
    // Method in render loop with @measureTime
    {
      code: `
        class ViewLogicService {
          @logMethod()
          @measureTime()
          public getBossVisuals(state: GameState, time: number): BossVisualData {
            // Complex calculations
            for (let i = 0; i < 1000; i++) {
              this.compute(i);
            }
            return visuals;
          }
        }
      `,
      filename: 'src/services/ViewLogicService.ts'
    },
    // Simple getter in render loop (exempt from @measureTime)
    {
      code: `
        class StateService {
          @logMethod()
          public getCurrentState(): GameState {
            return this.state;
          }
        }
      `,
      filename: 'src/services/StateService.ts'
    },
    // Method with performance exemption comment
    {
      code: `
        class RenderService {
          /**
           * @performance-exempt
           * This method is already optimized and profiled
           */
          @logMethod()
          public renderFrame(): void {
            requestAnimationFrame(() => {
              this.complexCalculation();
            });
          }
        }
      `,
      filename: 'src/services/RenderService.ts'
    },
    // Private method (exempt)
    {
      code: `
        class InternalService {
          private _internalRender(): void {
            useFrame(() => {
              this.calculate();
            });
          }
        }
      `,
      filename: 'src/services/InternalService.ts'
    },
    // Lifecycle methods (exempt)
    {
      code: `
        class LifecycleService {
          public initialize(): void {
            useFrame(() => {
              this.render();
            });
          }
          
          public cleanup(): void {
            this.stopRendering();
          }
        }
      `,
      filename: 'src/services/LifecycleService.ts'
    },
    // Non-service file
    {
      code: `
        const MyComponent = () => {
          useFrame(() => {
            complexCalculation();
          });
        };
      `,
      filename: 'src/components/MyComponent.tsx'
    },
    // CONTEXTUAL INTELLIGENCE TEST: Simple getter in render loop (no @measureTime needed)
    {
      code: `
        class GameStateService {
          @logMethod()
          public getCurrentState(): GameState {
            return this.state;
          }
          
          public render(): void {
            useFrame(() => {
              const state = this.getCurrentState();
              this.visualize(state);
            });
          }
        }
      `,
      filename: 'src/services/GameStateService.ts'
    },
    // CONTEXTUAL INTELLIGENCE TEST: Simple delegation method in render loop
    {
      code: `
        class RenderOrchestratorService {
          @logMethod()
          public getVisuals(): VisualData {
            return this.viewLogicService.getVisuals();
          }
          
          public render(): void {
            useFrame(() => {
              const visuals = this.getVisuals();
            });
          }
        }
      `,
      filename: 'src/services/RenderOrchestratorService.ts'
    },
    // CONTEXTUAL INTELLIGENCE TEST: TimerService thin wrapper (platform abstraction)
    {
      code: `
        class TimerService {
          @logMethod()
          public setTimeout(callback: Function, delay: number): number {
            return window.setTimeout(callback, delay);
          }
          
          @logMethod()
          public clearTimeout(id: number): void {
            window.clearTimeout(id);
          }
        }
      `,
      filename: 'src/services/TimerService.ts'
    },
    // CONTEXTUAL INTELLIGENCE TEST: Short method with just property access
    {
      code: `
        class ConfigService {
          @logMethod()
          public isEnabled(): boolean {
            return this.config.enabled;
          }
        }
      `,
      filename: 'src/services/ConfigService.ts'
    },
    // CONTEXTUAL INTELLIGENCE TEST: Method with performance exemption
    {
      code: `
        class OptimizedService {
          /**
           * @performance-exempt - Already profiled and optimized
           */
          @logMethod()
          public criticalPath(): void {
            useFrame(() => {
              for (let i = 0; i < 10000; i++) {
                this.process(i);
              }
            });
          }
        }
      `,
      filename: 'src/services/OptimizedService.ts'
    }
  ],

  invalid: [
    // addEventListener with high-frequency event without throttle
    {
      code: `
        class BrowserService {
          public initialize(): void {
            window.addEventListener('resize', () => {
              this.handleResize();
            });
          }
        }
      `,
      filename: 'src/services/BrowserService.ts',
      errors: [{
        messageId: 'missingThrottle',
        data: { eventName: 'resize' }
      }]
    },
    // scroll event without throttle
    {
      code: `
        class ScrollService {
          public setupListeners(): void {
            document.addEventListener('scroll', this.onScroll);
          }
        }
      `,
      filename: 'src/services/ScrollService.ts',
      errors: [{
        messageId: 'missingThrottle',
        data: { eventName: 'scroll' }
      }]
    },
    // mousemove event without throttle
    {
      code: `
        class MouseService {
          public track(): void {
            canvas.addEventListener('mousemove', (e) => {
              this.updatePosition(e.clientX, e.clientY);
            });
          }
        }
      `,
      filename: 'src/services/MouseService.ts',
      errors: [{
        messageId: 'missingThrottle',
        data: { eventName: 'mousemove' }
      }]
    },
    // CONTEXTUAL INTELLIGENCE TEST: Computationally intensive method requires @measureTime
    {
      code: `
        class ViewLogicService {
          @logMethod()
          public calculateParticles(state: GameState): ParticleData[] {
            const particles = [];
            for (let i = 0; i < 1000; i++) {
              particles.push(this.createParticle(i));
            }
            
            useFrame(() => {
              this.updateParticles(particles);
            });
            
            return particles.filter(p => p.active);
          }
        }
      `,
      filename: 'src/services/ViewLogicService.ts',
      errors: [{
        messageId: 'suggestMeasureTime',
        data: { methodName: 'calculateParticles' }
      }]
    },
    // CONTEXTUAL INTELLIGENCE TEST: GPU operations require @measureTime
    {
      code: `
        class RenderingService {
          @logMethod()
          public updateBufferGeometry(data: Float32Array): void {
            this.geometry.setAttribute('position', new BufferAttribute(data, 3));
            this.geometry.computeVertexNormals();
            
            useFrame(() => {
              this.material.setUniform('time', performance.now());
            });
          }
        }
      `,
      filename: 'src/services/RenderingService.ts',
      errors: [{
        messageId: 'suggestMeasureTime',
        data: { methodName: 'updateBufferGeometry' }
      }]
    },
    // CONTEXTUAL INTELLIGENCE TEST: Long method with complex calculations
    {
      code: `
        class PhysicsService {
          @logMethod()
          public calculatePhysics(particles: Particle[]): void {
            // This is a long method with complex calculations
            const forces = particles.map(p => this.calculateForce(p));
            const velocities = forces.map((f, i) => this.calculateVelocity(f, particles[i]));
            const positions = velocities.map((v, i) => this.calculatePosition(v, particles[i]));
            
            for (let i = 0; i < particles.length; i++) {
              particles[i].position = positions[i];
              particles[i].velocity = velocities[i];
            }
            
            useFrame(() => {
              this.updateParticles(particles);
            });
          }
        }
      `,
      filename: 'src/services/PhysicsService.ts',
      errors: [{
        messageId: 'suggestMeasureTime',
        data: { methodName: 'calculatePhysics' }
      }]
    },
    // Multiple high-frequency events without throttle
    {
      code: `
        class EventService {
          public initialize(): void {
            window.addEventListener('resize', this.onResize);
            window.addEventListener('scroll', this.onScroll);
            canvas.addEventListener('mousemove', this.onMouseMove);
          }
        }
      `,
      filename: 'src/services/EventService.ts',
      errors: [
        {
          messageId: 'missingThrottle',
          data: { eventName: 'resize' }
        },
        {
          messageId: 'missingThrottle',
          data: { eventName: 'scroll' }
        },
        {
          messageId: 'missingThrottle',
          data: { eventName: 'mousemove' }
        }
      ]
    },
    // JSX high-frequency event without throttle
    {
      code: `
        const MyComponent = () => {
          return <div onScroll={() => updatePosition()} />;
        };
      `,
      filename: 'src/components/MyComponent.tsx',
      errors: [{
        messageId: 'highFrequencyEventWarning',
        data: { eventName: 'scroll' }
      }]
    },
    // wheel event (high-frequency)
    {
      code: `
        class ZoomService {
          public enableZoom(): void {
            canvas.addEventListener('wheel', (e) => {
              this.zoom(e.deltaY);
            });
          }
        }
      `,
      filename: 'src/services/ZoomService.ts',
      errors: [{
        messageId: 'missingThrottle',
        data: { eventName: 'wheel' }
      }]
    },
    // touchmove event (high-frequency mobile)
    {
      code: `
        class TouchService {
          public enableTouch(): void {
            element.addEventListener('touchmove', this.handleTouch);
          }
        }
      `,
      filename: 'src/services/TouchService.ts',
      errors: [{
        messageId: 'missingThrottle',
        data: { eventName: 'touchmove' }
      }]
    }
  ]
});
