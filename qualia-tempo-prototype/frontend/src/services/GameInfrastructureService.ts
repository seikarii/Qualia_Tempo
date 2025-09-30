import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IGameInfrastructureService } from "./interfaces/IGameInfrastructureService";
import type { ITimerService, IPerformanceService } from "./interfaces/ITimerService";
import type { IAudioService } from "./interfaces/IAudioService";

@injectable()
export class GameInfrastructureService implements IGameInfrastructureService {
  public readonly timerService: ITimerService;
  public readonly performanceService: IPerformanceService;
  public readonly audioService: IAudioService;

  constructor(
    @inject(TYPES.ITimerService) timerService: ITimerService,
    @inject(TYPES.IPerformanceService) performanceService: IPerformanceService,
    @inject(TYPES.IAudioService) audioService: IAudioService
  ) {
    this.timerService = timerService;
    this.performanceService = performanceService;
    this.audioService = audioService;
  }
}