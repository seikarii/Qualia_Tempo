import { System } from '../ecs/System.js';
import { EventManager } from '../events/EventManager.js';
import { QualiaState } from '../ecs/components/QualiaState.js';
import { BossState } from '../ecs/components/BossState.js';
import { PlayerState } from '../ecs/components/PlayerState.js';
import { GameState } from '../ecs/components/GameState.js';
import { ECSManager } from '../ecs/ECSManager.js';
import { Entity } from '../ecs/Entity.js';
import { config } from '../config';

/**
 * The system responsible for managing the Qualia state.
 */
export class QualiaSystem extends System {
    name = 'QualiaSystem';
    private eventManager: EventManager;

    // Internal state for calculations
    private comboCount: number = 0;
    private dashSuccessCount: number = 0;
    private dashAttemptCount: number = 0;

    constructor(ecs: ECSManager, eventManager: EventManager) {
        super();
        this.ecs = ecs;
        this.eventManager = eventManager;
        this.eventManager.on('player_hit_note', this.handlePlayerHitNote.bind(this));
        this.eventManager.on('player_miss_note', this.handlePlayerMissNote.bind(this));
        this.eventManager.on('player_ability_pause', this.handleAbilityPause.bind(this));
        this.eventManager.on('player_ability_fast_forward', this.handleAbilityFastForward.bind(this));
        this.eventManager.on('player_ability_rewind', this.handleAbilityRewind.bind(this));
        this.eventManager.on('player_ability_ultimate', this.handleAbilityUltimate.bind(this));
        this.eventManager.on('player_dash_success', this.handlePlayerDashSuccess.bind(this));
        this.eventManager.on('player_dash_fail', this.handlePlayerDashFail.bind(this));
    }

    /**
     * Updates the Qualia system.
     * @param deltaTime The time since the last update.
     */
    update(deltaTime: number): void {
        const qualiaEntities: Entity[] = this.ecs.getEntitiesByComponent(QualiaState);
        const bossEntities: Entity[] = this.ecs.getEntitiesByComponent(BossState);
        const gameEntities: Entity[] = this.ecs.getEntitiesByComponent(GameState);

        if (qualiaEntities.length === 0 || bossEntities.length === 0 || gameEntities.length === 0) {
            return;
        }

        const qualiaState: QualiaState | undefined = this.ecs.getComponent<QualiaState>(qualiaEntities[0], QualiaState);
        const bossState: BossState | undefined = this.ecs.getComponent<BossState>(bossEntities[0], BossState);
        const gameState: GameState | undefined = this.ecs.getComponent<GameState>(gameEntities[0], GameState);

        if (!qualiaState || !bossState || !gameState) {
            return;
        }

        // --- Qualia State Calculations ---
        // Precision: Based on combo
        qualiaState.precision = Math.min(config.QUALIA_SYSTEM.COMBO_MULTIPLIER, this.comboCount / config.QUALIA_SYSTEM.MAX_COMBO); // Max precision at 100 combo

        // Aggression: Influenced by Fast Forward and high combo
        qualiaState.aggression = Math.min(config.QUALIA_SYSTEM.COMBO_MULTIPLIER, this.comboCount / config.QUALIA_SYSTEM.NOTE_HIT_THRESHOLD); // Max aggression at 50 combo

        // Flow: Based on successful rhythmic dashes
        qualiaState.flow = this.dashAttemptCount > 0 ? (this.dashSuccessCount / this.dashAttemptCount) : 0;

        // Chaos: Based on missed notes and failed dashes
        qualiaState.chaos = Math.min(config.QUALIA_SYSTEM.COMBO_MULTIPLIER, (this.comboCount === 0 && this.dashAttemptCount > 0 && this.dashSuccessCount < this.dashAttemptCount) ? 1 : 0); // Simple: if combo is 0 and some dashes failed, chaos is high. Needs refinement.

        // Intensity: Weighted sum of other Qualia types
        qualiaState.intensity = (qualiaState.precision * config.QUALIA_SYSTEM.NOTE_MISS_THRESHOLD + qualiaState.aggression * config.QUALIA_SYSTEM.DASH_SUCCESS_THRESHOLD + qualiaState.flow * config.QUALIA_SYSTEM.DASH_FAIL_THRESHOLD + qualiaState.recovery * config.QUALIA_SYSTEM.ABILITY_PAUSE_THRESHOLD + qualiaState.transcendence * config.QUALIA_SYSTEM.ABILITY_FAST_FORWARD_THRESHOLD);
        qualiaState.intensity = Math.min(config.QUALIA_SYSTEM.COMBO_MULTIPLIER, Math.max(0, qualiaState.intensity)); // Clamp between 0 and 1

        // --- Apply Qualia Effects ---

        // Boss Damage (passive)
        bossState.health -= qualiaState.intensity * config.QUALIA_SYSTEM.ABILITY_REWIND_THRESHOLD * deltaTime; // Example damage scaling
        this.eventManager.emit('boss_health_updated', { health: bossState.health });

        // Boss Escalation (placeholder for NPCAISystem)
        if (qualiaState.intensity > config.QUALIA_SYSTEM.ABILITY_ULTIMATE_THRESHOLD && !bossState.isAggressive) {
            bossState.isAggressive = true;
            this.eventManager.emit('boss_escalate_aggression', { level: qualiaState.intensity });
        }

        // Music Tempo Escalation (placeholder for MusicSystem)
        this.eventManager.emit('music_tempo_update', { intensity: qualiaState.intensity, combo: this.comboCount });

        // Visual Escalation (sent to Python backend)
        this.sendQualiaStateToBackend(qualiaState);

        this.eventManager.emit('qualia_updated', qualiaState);
        this.eventManager.emit('combo_updated', { combo: this.comboCount });
    }

    /**
     * Handles the player hit note event.
     */
    private handlePlayerHitNote() {
        const qualiaEntities: Entity[] = this.ecs.getEntitiesByComponent(QualiaState);
        if (qualiaEntities.length === 0) return;
        const qualiaState: QualiaState | undefined = this.ecs.getComponent<QualiaState>(qualiaEntities[0], QualiaState);
        if (!qualiaState) return;

        this.comboCount++;
    }

    /**
     * Handles the player miss note event.
     */
    private handlePlayerMissNote() {
        const qualiaEntities: Entity[] = this.ecs.getEntitiesByComponent(QualiaState);
        if (qualiaEntities.length === 0) return;
        const qualiaState: QualiaState | undefined = this.ecs.getComponent<QualiaState>(qualiaEntities[0], QualiaState);
        if (!qualiaState) return;

        this.comboCount = 0; // Reset combo on miss
    }

    /**
     * Handles the player dash success event.
     */
    private handlePlayerDashSuccess() {
        this.dashSuccessCount++;
        this.dashAttemptCount++;
    }

    /**
     * Handles the player dash fail event.
     */
    private handlePlayerDashFail() {
        this.dashAttemptCount++;
    }

    /**
     * Handles the ability pause event.
     */
    private handleAbilityPause() {
        const gameEntities: Entity[] = this.ecs.getEntitiesByComponent(GameState);
        if (gameEntities.length === 0) return;
        const gameState: GameState | undefined = this.ecs.getComponent<GameState>(gameEntities[0], GameState);
        if (!gameState) return;

        const originalGameSpeed = gameState.gameSpeedMultiplier;
        gameState.gameSpeedMultiplier = config.QUALIA_SYSTEM.DASH_FAIL_THRESHOLD; // 20% speed
        setTimeout(() => {
            gameState.gameSpeedMultiplier = originalGameSpeed;
        }, config.QUALIA_SYSTEM.SEND_STATE_INTERVAL); // 0.2 seconds
        this.eventManager.emit('game_speed_changed', { multiplier: gameState.gameSpeedMultiplier });
        
        const qualiaEntities: Entity[] = this.ecs.getEntitiesByComponent(QualiaState);
        if (qualiaEntities.length === 0) return;
        const qualiaState: QualiaState | undefined = this.ecs.getComponent<QualiaState>(qualiaEntities[0], QualiaState);
        if (qualiaState) {
            qualiaState.precision = Math.min(config.QUALIA_SYSTEM.COMBO_MULTIPLIER, qualiaState.precision + config.QUALIA_SYSTEM.ABILITY_PAUSE_THRESHOLD); // Example increase
        }
    }

    /**
     * Handles the ability fast forward event.
     */
    private handleAbilityFastForward() {
        const qualiaEntities: Entity[] = this.ecs.getEntitiesByComponent(QualiaState);
        if (qualiaEntities.length === 0) return;
        const qualiaState: QualiaState | undefined = this.ecs.getComponent<QualiaState>(qualiaEntities[0], QualiaState);
        if (!qualiaState) return;

        const originalAggression = qualiaState.aggression;
        qualiaState.aggression = Math.min(config.QUALIA_SYSTEM.COMBO_MULTIPLIER, qualiaState.aggression + config.QUALIA_SYSTEM.REWIND_RATE); // Example temporary boost
        setTimeout(() => {
            qualiaState.aggression = originalAggression;
        }, config.QUALIA_SYSTEM.ULTIMATE_DURATION); // Brief period, adjust as needed
        this.eventManager.emit('fast_forward_activated', { aggression: qualiaState.aggression });
    }

    /**
     * Handles the ability rewind event.
     */
    private handleAbilityRewind() {
        const playerEntities: Entity[] = this.ecs.getEntitiesByComponent(PlayerState);
        if (playerEntities.length === 0) return;
        const playerState: PlayerState | undefined = this.ecs.getComponent<PlayerState>(playerEntities[0], PlayerState);
        if (!playerState) return;

        playerState.health = Math.min(playerState.maxHealth, playerState.health + playerState.maxHealth * config.QUALIA_SYSTEM.DASH_FAIL_THRESHOLD); // Restore 20% health
        playerState.dashCharges = Math.min(playerState.maxDashCharges, playerState.dashCharges + config.QUALIA_SYSTEM.COMBO_MULTIPLIER); // Restore 1 dash charge
        this.eventManager.emit('player_rewind_activated', { health: playerState.health, dashCharges: playerState.dashCharges });

        const qualiaEntities: Entity[] = this.ecs.getEntitiesByComponent(QualiaState);
        if (qualiaEntities.length === 0) return;
        const qualiaState: QualiaState | undefined = this.ecs.getComponent<QualiaState>(qualiaEntities[0], QualiaState);
        if (qualiaState) {
            qualiaState.recovery = Math.min(config.QUALIA_SYSTEM.COMBO_MULTIPLIER, qualiaState.recovery + config.QUALIA_SYSTEM.DASH_FAIL_THRESHOLD); // Example increase
        }
    }

    /**
     * Handles the ability ultimate event.
     */
    private handleAbilityUltimate() {
        const qualiaEntities: Entity[] = this.ecs.getEntitiesByComponent(QualiaState);
        if (qualiaEntities.length === 0) return;
        const qualiaState: QualiaState | undefined = this.ecs.getComponent<QualiaState>(qualiaEntities[0], QualiaState);
        if (!qualiaState) return;

        qualiaState.transcendence = config.QUALIA_SYSTEM.COMBO_MULTIPLIER; // Activate ultimate state

        // Emit events for visual/audio changes (8D audio, Charlie's voice, floor movement)
        this.eventManager.emit('ultimate_activated_audio_visual');
        this.eventManager.emit('ultimate_activated_gameplay_intensity');

        setTimeout(() => {
            qualiaState.transcendence = 0; // Deactivate ultimate state
            this.eventManager.emit('ultimate_deactivated');
        }, config.ABILITIES.FAST_FORWARD_COOLDOWN); // 10 seconds, adjust as needed
    }

    /**
     * Sends the Qualia state to the backend.
     * @param qualiaState The Qualia state.
     */
    private async sendQualiaStateToBackend(qualiaState: QualiaState) {
        try {
            const response = await fetch(`${config.API_URL}/update_qualia`, { // Backend runs on port 8000
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(qualiaState),
            });

            if (!response.ok) {
                console.error('Failed to send QualiaState to backend:', response.statusText);
            }
        } catch (error) {
            console.error('Error sending QualiaState to backend:', error);
        }
    }
}
