import { System } from '../ecs/System.js';
import { EventManager } from '../events/EventManager';
import * as Tone from 'tone';
import { CombatManager } from '../data/CombatManager';
import { GameEvent } from '../events/GameEvents';
import { config } from '../config';

/**
 * The system responsible for managing the music and audio.
 */
export class MusicSystem extends System {
  private eventManager: EventManager;
  private combatManager: CombatManager;
  private player: Tone.Player | null = null;
  private isInitialized = false;
  private currentBpm: number = 0;
  private panner: Tone.Panner3D | null = null;
  private charlieVoicePlayer: Tone.Player | null = null;
  private layers: Tone.Player[] = [];
  private beatLoop: Tone.Loop | null = null;

  constructor(eventManager: EventManager, combatManager: CombatManager) {
    super(); // Call the base System constructor
    this.eventManager = eventManager;
    this.combatManager = combatManager;
    this.eventManager.on(GameEvent.StartAudio, this.handleStartAudio.bind(this));
    this.eventManager.on('music_tempo_update', this.handleMusicTempoUpdate.bind(this));
    this.eventManager.on('ultimate_activated_audio_visual', this.handleUltimateActivated.bind(this));
    this.eventManager.on('ultimate_deactivated', this.handleUltimateDeactivated.bind(this));
  }

  /**
   * Initializes Tone.js.
   */
  private async initializeTone() {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    // Tone.js context initialization
    await Tone.start();

    this.panner = new Tone.Panner3D().toDestination();

    this.player = new Tone.Player({
      url: '',
      loop: true,
      autostart: false,
    }).connect(this.panner);

    this.charlieVoicePlayer = new Tone.Player({
      url: config.MUSIC.CHARLIE_VOICE_URL,
      loop: true,
      autostart: false,
      volume: -Infinity // Start muted
    }).connect(this.panner);

    this.layers = [
      new Tone.Player({ src: config.MUSIC.TRACK_2_URL, loop: true, autostart: false, volume: -Infinity }).toDestination(),
      new Tone.Player({ src: config.MUSIC.TRACK_3_URL, loop: true, autostart: false, volume: -Infinity }).toDestination(),
      new Tone.Player({ src: config.MUSIC.TRACK_4_URL, loop: true, autostart: false, volume: -Infinity }).toDestination(),
    ];

    await Promise.all([
      this.player.loaded,
      this.charlieVoicePlayer.loaded,
      ...this.layers.map(layer => layer.loaded)
    ]);
    
    Tone.Transport.start(); // Start Tone.Transport

    this.beatLoop = new Tone.Loop(() => {
        this.eventManager.emit(GameEvent.Beat, { time: Tone.Transport.seconds, bpm: Tone.Transport.bpm.value });
    }, '4n').start(0); // Trigger every quarter note

    this.isInitialized = true;
    console.log('MusicSystem initialized with Tone.js');
  }

  /**
   * Loads and plays a track.
   * @param combatId The ID of the combat.
   */
  public async loadAndPlayTrack(combatId: string) {
    await this.initializeTone();
    const combatData = this.combatManager.getCombatData(combatId);
    if (!combatData || !this.player) {
      console.error(`Combat data for ${combatId} not found or Tone.Player not initialized.`);
      return;
    }

    if (combatId === 'Boss1') {
        this.player.url.value = config.MUSIC.BOSS_1_URL;
    } else {
        this.player.url.value = combatData.audioPath;
    }
    this.currentBpm = combatData.bpm;
    Tone.Transport.bpm.value = this.currentBpm; // Set initial BPM
    this.player.start();
    this.layers.forEach(layer => layer.start());
    this.charlieVoicePlayer?.start();
    if (this.beatLoop) {
        this.beatLoop.interval = `${60 / this.currentBpm}s`; // Set beat interval based on BPM
        this.beatLoop.start(0);
    }
  }

  /**
   * Handles the start audio event.
   * @param data The event data.
   */
  private async handleStartAudio(data: { trackId: string }) {
    await this.loadAndPlayTrack(data.trackId);
  }

  /**
   * Handles the music tempo update event.
   * @param data The event data.
   */
  private handleMusicTempoUpdate(data: { intensity: number; combo: number }) {
    const maxTempoMultiplier = 1.5;
    const comboThreshold = 50;

    let tempoMultiplier = 1;
    if (data.combo >= comboThreshold) {
      tempoMultiplier = maxTempoMultiplier;
    } else {
      tempoMultiplier = 1 + (maxTempoMultiplier - 1) * (data.combo / comboThreshold);
    }

    if (Tone.Transport) {
      Tone.Transport.bpm.value = this.currentBpm * tempoMultiplier;
      if (this.beatLoop) {
          this.beatLoop.interval = `${60 / Tone.Transport.bpm.value}s`;
      }
    }

    // Coro Infinito: Adjust layer volumes based on intensity/combo
    const baseVolume = config.MUSIC.DEFAULT_VOLUME; // dB
    const maxVolume = 0; // dB

    if (this.layers[0]) this.layers[0].volume.value = baseVolume + (maxVolume - baseVolume) * Math.min(1, data.intensity * 2);
    if (this.layers[1]) this.layers[1].volume.value = baseVolume + (maxVolume - baseVolume) * Math.min(1, data.intensity * 3);
    if (this.layers[2]) this.layers[2].volume.value = baseVolume + (maxVolume - baseVolume) * Math.min(1, data.intensity * 4);
  }

  /**
   * Handles the ultimate activated event.
   */
  private handleUltimateActivated() {
    if (this.panner) {
      // Example 8D audio effect: move the sound source around the listener
      this.panner.positionX.value = 5;
      this.panner.positionY.value = 0;
      this.panner.positionZ.value = 0;
      this.panner.orientationX.value = 0;
      this.panner.orientationY.value = 1;
      this.panner.orientationZ.value = 0;
    }
    if (this.charlieVoicePlayer) {
      this.charlieVoicePlayer.volume.value = 0; // Unmute Charlie's voice
    }
  }

  /**
   * Handles the ultimate deactivated event.
   */
  private handleUltimateDeactivated() {
    if (this.panner) {
      // Reset panner position
      this.panner.positionX.value = 0;
      this.panner.positionY.value = 0;
      this.panner.positionZ.value = 0;
    }
    if (this.charlieVoicePlayer) {
      this.charlieVoicePlayer.volume.value = -Infinity; // Mute Charlie's voice
    }
  }

  /**
   * Updates the music system.
   */
  public update(): void {
    // Lógica de análisis de música si es necesaria
  }
}