const { RuleTester } = require('eslint');
const rule = require('../lib/rules/no-direct-timer-access');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('no-direct-timer-access', rule, {
  valid: [
    // ✅ Correct: Using ITimerService
    {
      code: `
        class MyService {
          constructor(private timerService: ITimerService) {}
          
          startTimer() {
            this.timerService.setTimeout(() => {
              console.log('Timer fired');
            }, 1000);
          }
        }
      `,
      filename: 'MyService.ts'
    },
    
    // ✅ Correct: Using ITimerService for interval
    {
      code: `
        class IntervalService {
          private timerId: number;
          
          startPolling() {
            this.timerId = this.timerService.setInterval(() => {
              this.poll();
            }, 5000);
          }
          
          stopPolling() {
            this.timerService.clearInterval(this.timerId);
          }
        }
      `,
      filename: 'IntervalService.ts'
    },
    
    // ✅ Exempt: Code within TimerProvider.ts
    {
      code: `
        export class BrowserTimerProvider implements ITimerProvider {
          setTimeout(callback: Function, delay: number): number {
            return window.setTimeout(callback, delay);
          }
        }
      `,
      filename: 'BrowserTimerProvider.ts'
    },
    
    // ✅ Correct: requestAnimationFrame through service
    {
      code: `
        class AnimationService {
          animate() {
            this.timerService.requestAnimationFrame(() => {
              this.render();
            });
          }
        }
      `,
      filename: 'AnimationService.ts'
    },
    
    // ✅ Correct: clearTimeout through service
    {
      code: `
        class TimeoutService {
          private timerId: number;
          
          schedule() {
            this.timerId = this.timerService.setTimeout(() => {}, 1000);
          }
          
          cancel() {
            this.timerService.clearTimeout(this.timerId);
          }
        }
      `,
      filename: 'TimeoutService.ts'
    }
  ],

  invalid: [
    // ❌ Direct setTimeout call
    {
      code: `
        class BadService {
          startTimer() {
            setTimeout(() => {
              console.log('Bad pattern');
            }, 1000);
          }
        }
      `,
      filename: 'BadService.ts',
      errors: [{ 
        messageId: 'directTimerAccess'
       }]
    },
    
    // ❌ Direct setInterval call
    {
      code: `
        class BadIntervalService {
          startPolling() {
            setInterval(() => {
              this.poll();
            }, 5000);
          }
        }
      `,
      filename: 'BadIntervalService.ts',
      errors: [{ 
        messageId: 'directTimerAccess'
       }]
    },
    
    // ❌ window.setTimeout call
    {
      code: `
        class WindowTimerService {
          scheduleTask() {
            window.setTimeout(() => {
              this.executeTask();
            }, 2000);
          }
        }
      `,
      filename: 'WindowTimerService.ts',
      errors: [{ 
        messageId: 'directTimerAccess'
       }]
    },
    
    // ❌ globalThis.setInterval call
    {
      code: `
        class GlobalTimerService {
          startInterval() {
            globalThis.setInterval(() => {
              this.tick();
            }, 1000);
          }
        }
      `,
      filename: 'GlobalTimerService.ts',
      errors: [{ 
        messageId: 'directTimerAccess'
       }]
    },
    
    // ❌ Direct requestAnimationFrame
    {
      code: `
        class AnimationEngine {
          render() {
            requestAnimationFrame(() => {
              this.drawFrame();
            });
          }
        }
      `,
      filename: 'AnimationEngine.ts',
      errors: [{ 
        messageId: 'directTimerAccess'
       }]
    },
    
    // ❌ Direct cancelAnimationFrame
    {
      code: `
        class AnimationController {
          stopAnimation() {
            cancelAnimationFrame(this.frameId);
          }
        }
      `,
      filename: 'AnimationController.ts',
      errors: [{ 
        messageId: 'directTimerAccess'
       }]
    },
    
    // ❌ Direct clearTimeout
    {
      code: `
        class TimeoutManager {
          cancelTimeout() {
            clearTimeout(this.timerId);
          }
        }
      `,
      filename: 'TimeoutManager.ts',
      errors: [{ 
        messageId: 'directTimerAccess'
       }]
    },
    
    // ❌ Direct clearInterval
    {
      code: `
        class IntervalManager {
          stopInterval() {
            clearInterval(this.intervalId);
          }
        }
      `,
      filename: 'IntervalManager.ts',
      errors: [{ 
        messageId: 'directTimerAccess'
       }]
    },
    
    // ❌ Multiple violations in one method
    {
      code: `
        class MultiViolationService {
          complexTiming() {
            const timeout = setTimeout(() => {}, 1000);
            const interval = setInterval(() => {}, 500);
            clearTimeout(timeout);
            clearInterval(interval);
          }
        }
      `,
      filename: 'MultiViolationService.ts',
      errors: [
        {
          messageId: 'directTimerAccess'
        }
      ]
    }
  ]
});

console.log('✅ All no-direct-timer-access tests passed!');
