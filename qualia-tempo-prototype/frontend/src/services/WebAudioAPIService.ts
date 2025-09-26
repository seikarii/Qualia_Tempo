import { injectable } from "inversify";
import { IWebAudioAPIService } from "./interfaces/IWebAudioAPIService";

@injectable()
export class WebAudioAPIService implements IWebAudioAPIService {
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
  }

  public getAudioContext(): AudioContext {
    if (!this.audioContext) {
      throw new Error("AudioContext is not available in this environment.");
    }
    return this.audioContext;
  }
}
