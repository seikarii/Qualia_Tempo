/**
 * Performance Profiling Utility
 * Phase 6.5 - Integration & Stability Testing
 * 
 * Provides comprehensive performance monitoring for:
 * - Latency measurements (Backend → Frontend render)
 * - Frame rate validation (60fps target)
 * - Memory leak detection
 * - Resource monitoring (CPU, GPU, Network)
 * - Mapper overhead profiling
 * 
 * @usage import { PerformanceProfiler } from './utils/performance-profiler';
 *        const profiler = new PerformanceProfiler();
 *        profiler.start();
 *        // ... run tests ...
 *        const report = profiler.generateReport();
 */

export interface PerformanceMetrics {
  // Latency metrics
  latency: {
    backend ToFrontend: number;      // Backend emit → Frontend receive (ms)
    frontendToRender: number;       // Frontend receive → Three.js render (ms)
    endToEnd: number;               // Backend emit → Pixel on screen (ms)
    samples: number[];              // All latency samples
    average: number;
    min: number;
    max: number;
    p50: number;                    // 50th percentile (median)
    p95: number;                    // 95th percentile
    p99: number;                    // 99th percentile
  };

  // Frame rate metrics
  frameRate: {
    current: number;
    average: number;
    min: number;
    max: number;
    samples: number[];
    droppedFrames: number;
    targetFPS: number;              // 60fps
    actualFPS: number;
    variance: number;               // Standard deviation
  };

  // Memory metrics
  memory: {
    initialHeapSize: number;        // MB
    currentHeapSize: number;        // MB
    peakHeapSize: number;           // MB
    heapGrowth: number;             // MB
    heapGrowthRate: number;         // MB/minute
    leakDetected: boolean;
    gcCount: number;
    gcDuration: number;             // Total ms spent in GC
  };

  // Network metrics
  network: {
    webSocketMessagesReceived: number;
    webSocketMessagesSent: number;
    messageRate: number;            // messages/second
    averageMessageSize: number;     // bytes
    bandwidth: number;              // KB/second
    reconnections: number;
    connectionUptime: number;       // seconds
  };

  // GPU/Rendering metrics
  rendering: {
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
    programs: number;
    renderTime: number;             // ms per frame
  };

  // Mapper overhead
  mappers: {
    playerMapperTime: number;       // Average ms
    bossMapperTime: number;         // Average ms
    totalMapperTime: number;        // Average ms per frame
    samples: Array<{
      timestamp: number;
      playerTime: number;
      bossTime: number;
    }>;
  };

  // Session info
  session: {
    startTime: number;
    endTime: number;
    duration: number;               // seconds
    samplingInterval: number;       // ms
    totalSamples: number;
  };
}

export class PerformanceProfiler {
  private metrics: PerformanceMetrics;
  private isRunning: boolean = false;
  private samplingInterval: number = 1000; // 1 second
  private intervalId: number | null = null;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private latencySamples: number[] = [];
  private fpsSamples: number[] = [];
  private mapperSamples: Array<{ timestamp: number; playerTime: number; bossTime: number; }> = [];

  constructor(samplingInterval: number = 1000) {
    this.samplingInterval = samplingInterval;
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): PerformanceMetrics {
    const now = performance.now();
    return {
      latency: {
        backendToFrontend: 0,
        frontendToRender: 0,
        endToEnd: 0,
        samples: [],
        average: 0,
        min: Infinity,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0
      },
      frameRate: {
        current: 0,
        average: 0,
        min: Infinity,
        max: 0,
        samples: [],
        droppedFrames: 0,
        targetFPS: 60,
        actualFPS: 0,
        variance: 0
      },
      memory: {
        initialHeapSize: this.getHeapSize(),
        currentHeapSize: this.getHeapSize(),
        peakHeapSize: this.getHeapSize(),
        heapGrowth: 0,
        heapGrowthRate: 0,
        leakDetected: false,
        gcCount: 0,
        gcDuration: 0
      },
      network: {
        webSocketMessagesReceived: 0,
        webSocketMessagesSent: 0,
        messageRate: 0,
        averageMessageSize: 0,
        bandwidth: 0,
        reconnections: 0,
        connectionUptime: 0
      },
      rendering: {
        drawCalls: 0,
        triangles: 0,
        geometries: 0,
        textures: 0,
        programs: 0,
        renderTime: 0
      },
      mappers: {
        playerMapperTime: 0,
        bossMapperTime: 0,
        totalMapperTime: 0,
        samples: []
      },
      session: {
        startTime: now,
        endTime: now,
        duration: 0,
        samplingInterval: this.samplingInterval,
        totalSamples: 0
      }
    };
  }

  /**
   * Start profiling session
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('[PerformanceProfiler] Already running');
      return;
    }

    console.log('[PerformanceProfiler] Starting performance profiling...');
    this.isRunning = true;
    this.metrics = this.initializeMetrics();
    this.metrics.session.startTime = performance.now();

    // Start sampling
    this.intervalId = window.setInterval(() => {
      this.sample();
    }, this.samplingInterval);

    // Hook into animation frame for FPS measurement
    this.measureFrameRate();

    // Expose metrics to window for testing
    (window as any).__PERFORMANCE_METRICS__ = this.metrics;
  }

  /**
   * Stop profiling session
   */
  public stop(): void {
    if (!this.isRunning) {
      console.warn('[PerformanceProfiler] Not running');
      return;
    }

    console.log('[PerformanceProfiler] Stopping performance profiling...');
    this.isRunning = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.metrics.session.endTime = performance.now();
    this.metrics.session.duration = (this.metrics.session.endTime - this.metrics.session.startTime) / 1000;

    // Calculate final statistics
    this.calculateStatistics();
  }

  /**
   * Sample current performance metrics
   */
  private sample(): void {
    this.metrics.session.totalSamples++;

    // Memory sampling
    this.sampleMemory();

    // Network sampling
    this.sampleNetwork();

    // Rendering sampling
    this.sampleRendering();

    // Mapper sampling
    this.sampleMappers();
  }

  /**
   * Sample memory metrics
   */
  private sampleMemory(): void {
    const currentHeap = this.getHeapSize();
    this.metrics.memory.currentHeapSize = currentHeap;

    if (currentHeap > this.metrics.memory.peakHeapSize) {
      this.metrics.memory.peakHeapSize = currentHeap;
    }

    this.metrics.memory.heapGrowth = currentHeap - this.metrics.memory.initialHeapSize;

    // Calculate growth rate (MB/minute)
    const durationMinutes = (performance.now() - this.metrics.session.startTime) / 60000;
    if (durationMinutes > 0) {
      this.metrics.memory.heapGrowthRate = this.metrics.memory.heapGrowth / durationMinutes;
    }

    // Detect potential memory leak (growth > 10MB/minute)
    if (this.metrics.memory.heapGrowthRate > 10) {
      this.metrics.memory.leakDetected = true;
    }
  }

  /**
   * Sample network metrics
   */
  private sampleNetwork(): void {
    const stats = (window as any).__WEBSOCKET_STATS__;
    if (stats) {
      this.metrics.network.webSocketMessagesReceived = stats.messagesReceived || 0;
      this.metrics.network.webSocketMessagesSent = stats.messagesSent || 0;
      this.metrics.network.reconnections = stats.reconnectAttempts || 0;

      // Calculate message rate
      const duration = (performance.now() - this.metrics.session.startTime) / 1000;
      if (duration > 0) {
        this.metrics.network.messageRate = this.metrics.network.webSocketMessagesReceived / duration;
      }

      this.metrics.network.connectionUptime = stats.connectionUptime || 0;
    }
  }

  /**
   * Sample rendering metrics
   */
  private sampleRendering(): void {
    const renderer = (window as any).__THREE_RENDERER__;
    if (renderer && renderer.info) {
      const info = renderer.info;
      this.metrics.rendering.drawCalls = info.render?.calls || 0;
      this.metrics.rendering.triangles = info.render?.triangles || 0;
      this.metrics.rendering.geometries = info.memory?.geometries || 0;
      this.metrics.rendering.textures = info.memory?.textures || 0;
      this.metrics.rendering.programs = info.programs?.length || 0;
    }
  }

  /**
   * Sample mapper performance
   */
  private sampleMappers(): void {
    const mapperStats = (window as any).__MAPPER_STATS__;
    if (mapperStats && mapperStats.samples.length > 0) {
      // Get latest samples
      const recentSamples = mapperStats.samples.slice(-10);
      
      const avgPlayer = recentSamples.reduce((sum: number, s: any) => sum + s.playerTime, 0) / recentSamples.length;
      const avgBoss = recentSamples.reduce((sum: number, s: any) => sum + s.bossTime, 0) / recentSamples.length;

      this.metrics.mappers.playerMapperTime = avgPlayer;
      this.metrics.mappers.bossMapperTime = avgBoss;
      this.metrics.mappers.totalMapperTime = avgPlayer + avgBoss;
      this.metrics.mappers.samples = recentSamples;
    }
  }

  /**
   * Measure frame rate
   */
  private measureFrameRate(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    
    if (this.lastFrameTime > 0) {
      const frameDuration = now - this.lastFrameTime;
      const fps = 1000 / frameDuration;
      
      this.fpsSamples.push(fps);
      this.metrics.frameRate.current = fps;

      // Track dropped frames (< 55fps)
      if (fps < 55) {
        this.metrics.frameRate.droppedFrames++;
      }

      // Update min/max
      if (fps < this.metrics.frameRate.min) {
        this.metrics.frameRate.min = fps;
      }
      if (fps > this.metrics.frameRate.max) {
        this.metrics.frameRate.max = fps;
      }
    }

    this.lastFrameTime = now;
    this.frameCount++;

    // Continue measuring
    requestAnimationFrame(() => this.measureFrameRate());
  }

  /**
   * Track latency sample
   */
  public trackLatency(latencyMs: number): void {
    this.latencySamples.push(latencyMs);
    this.metrics.latency.samples.push(latencyMs);

    // Update min/max
    if (latencyMs < this.metrics.latency.min) {
      this.metrics.latency.min = latencyMs;
    }
    if (latencyMs > this.metrics.latency.max) {
      this.metrics.latency.max = latencyMs;
    }
  }

  /**
   * Calculate final statistics
   */
  private calculateStatistics(): void {
    // Latency statistics
    if (this.latencySamples.length > 0) {
      this.metrics.latency.average = this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length;
      this.metrics.latency.p50 = this.percentile(this.latencySamples, 50);
      this.metrics.latency.p95 = this.percentile(this.latencySamples, 95);
      this.metrics.latency.p99 = this.percentile(this.latencySamples, 99);
    }

    // Frame rate statistics
    if (this.fpsSamples.length > 0) {
      this.metrics.frameRate.samples = this.fpsSamples;
      this.metrics.frameRate.average = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
      this.metrics.frameRate.actualFPS = this.metrics.frameRate.average;
      this.metrics.frameRate.variance = this.standardDeviation(this.fpsSamples);
    }
  }

  /**
   * Generate comprehensive performance report
   */
  public generateReport(): PerformanceMetrics {
    this.calculateStatistics();
    return { ...this.metrics };
  }

  /**
   * Generate human-readable report
   */
  public generateTextReport(): string {
    const report = this.generateReport();
    
    return `
===========================================
 PERFORMANCE PROFILING REPORT
===========================================

SESSION INFORMATION
-------------------------------------------
Duration: ${report.session.duration.toFixed(2)}s
Samples: ${report.session.totalSamples}
Sampling Interval: ${report.session.samplingInterval}ms

LATENCY METRICS
-------------------------------------------
Average: ${report.latency.average.toFixed(2)}ms
Median (P50): ${report.latency.p50.toFixed(2)}ms
P95: ${report.latency.p95.toFixed(2)}ms
P99: ${report.latency.p99.toFixed(2)}ms
Min: ${report.latency.min.toFixed(2)}ms
Max: ${report.latency.max.toFixed(2)}ms
Samples: ${report.latency.samples.length}

FRAME RATE METRICS
-------------------------------------------
Target: ${report.frameRate.targetFPS} FPS
Actual: ${report.frameRate.actualFPS.toFixed(2)} FPS
Average: ${report.frameRate.average.toFixed(2)} FPS
Min: ${report.frameRate.min.toFixed(2)} FPS
Max: ${report.frameRate.max.toFixed(2)} FPS
Variance: ${report.frameRate.variance.toFixed(2)}
Dropped Frames: ${report.frameRate.droppedFrames}
Frame Count: ${this.frameCount}

MEMORY METRICS
-------------------------------------------
Initial Heap: ${report.memory.initialHeapSize.toFixed(2)} MB
Current Heap: ${report.memory.currentHeapSize.toFixed(2)} MB
Peak Heap: ${report.memory.peakHeapSize.toFixed(2)} MB
Growth: ${report.memory.heapGrowth.toFixed(2)} MB
Growth Rate: ${report.memory.heapGrowthRate.toFixed(2)} MB/min
Leak Detected: ${report.memory.leakDetected ? 'YES ⚠️' : 'NO ✅'}

NETWORK METRICS
-------------------------------------------
Messages Received: ${report.network.webSocketMessagesReceived}
Messages Sent: ${report.network.webSocketMessagesSent}
Message Rate: ${report.network.messageRate.toFixed(2)} msg/s
Reconnections: ${report.network.reconnections}
Connection Uptime: ${report.network.connectionUptime.toFixed(2)}s

RENDERING METRICS
-------------------------------------------
Draw Calls: ${report.rendering.drawCalls}
Triangles: ${report.rendering.triangles}
Geometries: ${report.rendering.geometries}
Textures: ${report.rendering.textures}
Shader Programs: ${report.rendering.programs}

MAPPER OVERHEAD
-------------------------------------------
Player Mapper: ${report.mappers.playerMapperTime.toFixed(4)}ms
Boss Mapper: ${report.mappers.bossMapperTime.toFixed(4)}ms
Total: ${report.mappers.totalMapperTime.toFixed(4)}ms

===========================================
`;
  }

  /**
   * Export report to JSON file
   */
  public exportToJSON(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  // Utility functions

  private getHeapSize(): number {
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private standardDeviation(arr: number[]): number {
    if (arr.length === 0) return 0;
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(avgSquareDiff);
  }
}

// Expose to window for testing
if (typeof window !== 'undefined') {
  (window as any).PerformanceProfiler = PerformanceProfiler;
}
