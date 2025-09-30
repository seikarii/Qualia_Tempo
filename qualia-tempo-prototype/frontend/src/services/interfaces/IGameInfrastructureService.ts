import type { ITimerService, IPerformanceService } from "./ITimerService";
import type { IAudioService } from "./IAudioService";

export interface IGameInfrastructureService {
  readonly timerService: ITimerService;
  readonly performanceService: IPerformanceService;
  readonly audioService: IAudioService;
}