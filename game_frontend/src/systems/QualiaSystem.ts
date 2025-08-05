import { System } from '../ecs/System.js';
import { EventManager } from '../events/EventManager.js';
import { QualiaState } from '../ecs/components/QualiaState.js';
import { BossState } from '../ecs/components/BossState.js';
import { PlayerState } from '../ecs/components/PlayerState.js';
import { GameState } from '../ecs/components/GameState.js';
import { ECSManager } from '../ecs/ECSManager.js';
import { Entity } from '../ecs/Entity.js';

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
        qualiaState.precision = Math.min(1, this.comboCount / 100); // Max precision at 100 combo

        // Aggression: Influenced by Fast Forward and high combo
        qualiaState.aggression = Math.min(1, this.comboCount / 50); // Max aggression at 50 combo

        // Flow: Based on successful rhythmic dashes
        qualiaState.flow = this.dashAttemptCount > 0 ? (this.dashSuccessCount / this.dashAttemptCount) : 0;

        // Chaos: Based on missed notes and failed dashes
        qualiaState.chaos = Math.min(1, (this.comboCount === 0 && this.dashAttemptCount > 0 && this.dashSuccessCount < this.dashAttemptCount) ? 1 : 0); // Simple: if combo is 0 and some dashes failed, chaos is high. Needs refinement.

        // Intensity: Weighted sum of other Qualia types
        qualiaState.intensity = (qualiaState.precision * 0.3 + qualiaState.aggression * 0.3 + qualiaState.flow * 0.2 + qualiaState.recovery * 0.1 + qualiaState.transcendence * 0.1);
        qualiaState.intensity = Math.min(1, Math.max(0, qualiaState.intensity)); // Clamp between 0 and 1

        // --- Apply Qualia Effects ---

        // Boss Damage (passive)
        bossState.health -= qualiaState.intensity * 10 * deltaTime; // Example damage scaling
        this.eventManager.emit('boss_health_updated', { health: bossState.health });

        // Boss Escalation (placeholder for NPCAISystem)
        if (qualiaState.intensity > 0.7 && !bossState.isAggressive) {
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

    private handlePlayerHitNote() {
        const qualiaEntities: Entity[] = this.ecs.getEntitiesByComponent(QualiaState);
        if (qualiaEntities.length === 0) return;
        const qualiaState: QualiaState | undefined = this.ecs.getComponent<QualiaState>(qualiaEntities[0], QualiaState);
        if (!qualiaState) return;

        this.comboCount++;
    }

    private handlePlayerMissNote() {
        const qualiaEntities: Entity[] = this.ecs.getEntitiesByComponent(QualiaState);
        if (qualiaEntities.length === 0) return;
        const qualiaState: QualiaState | undefined = this.ecs.getComponent<QualiaState>(qualiaEntities[0], QualiaState);
        if (!qualiaState) return;

        this.comboCount = 0; // Reset combo on miss
    }

    private handlePlayerDashSuccess() {
        this.dashSuccessCount++;
        this.dashAttemptCount++;
    }

    private handlePlayerDashFail() {
        this.dashAttemptCount++;
    }

    private handleAbilityPause() {
        const gameEntities: Entity[] = this.ecs.getEntitiesByComponent(GameState);
        if (gameEntities.length === 0) return;
        const gameState: GameState | undefined = this.ecs.getComponent<GameState>(gameEntities[0], GameState);
        if (!gameState) return;

        const originalGameSpeed = gameState.gameSpeedMultiplier;
        gameState.gameSpeedMultiplier = 0.2; // 20% speed
        setTimeout(() => {
            gameState.gameSpeedMultiplier = originalGameSpeed;
        }, 200); // 0.2 seconds
        this.eventManager.emit('game_speed_changed', { multiplier: gameState.gameSpeedMultiplier });
        
        const qualiaEntities: Entity[] = this.ecs.getEntitiesByComponent(QualiaState);
        if (qualiaEntities.length === 0) return;
        const qualiaState: QualiaState | undefined = this.ecs.getComponent<QualiaState>(qualiaEntities[0], QualiaState);
        if (qualiaState) {
            qualiaState.precision = Math.min(1, qualiaState.precision + 0.1); // Example increase
        }
    }

    private handleAbilityFastForward() {
        const qualiaEntities: Entity[] = this.ecs.getEntitiesByComponent(QualiaState);
        if (qualiaEntities.length === 0) return;
        const qualiaState: QualiaState | undefined = this.ecs.getComponent<QualiaState>(qualiaEntities[0], QualiaState);
        if (!qualiaState) return;

        const originalAggression = qualiaState.aggression;
        qualiaState.aggression = Math.min(1, qualiaState.aggression + 0.5); // Example temporary boost
        setTimeout(() => {
            qualiaState.aggression = originalAggression;
        }, 5000); // Brief period, adjust as needed
        this.eventManager.emit('fast_forward_activated', { aggression: qualiaState.aggression });
    }

    private handleAbilityRewind() {
        const playerEntities: Entity[] = this.ecs.getEntitiesByComponent(PlayerState);
        if (playerEntities.length === 0) return;
        const playerState: PlayerState | undefined = this.ecs.getComponent<PlayerState>(playerEntities[0], PlayerState);
        if (!playerState) return;

        playerState.health = Math.min(playerState.maxHealth, playerState.health + playerState.maxHealth * 0.2); // Restore 20% health
        playerState.dashCharges = Math.min(playerState.maxDashCharges, playerState.dashCharges + 1); // Restore 1 dash charge
        this.eventManager.emit('player_rewind_activated', { health: playerState.health, dashCharges: playerState.dashCharges });

        const qualiaEntities: Entity[] = this.ecs.getEntitiesByComponent(QualiaState);
        if (qualiaEntities.length === 0) return;
        const qualiaState: QualiaState | undefined = this.ecs.getComponent<QualiaState>(qualiaEntities[0], QualiaState);
        if (qualiaState) {
            qualiaState.recovery = Math.min(1, qualiaState.recovery + 0.2); // Example increase
        }
    }

    private handleAbilityUltimate() {
        const qualiaEntities: Entity[] = this.ecs.getEntitiesByComponent(QualiaState);
        if (qualiaEntities.length === 0) return;
        const qualiaState: QualiaState | undefined = this.ecs.getComponent<QualiaState>(qualiaEntities[0], QualiaState);
        if (!qualiaState) return;

        qualiaState.transcendence = 1; // Activate ultimate state

        // Emit events for visual/audio changes (8D audio, Charlie's voice, floor movement)
        this.eventManager.emit('ultimate_activated_audio_visual');
        this.eventManager.emit('ultimate_activated_gameplay_intensity');

        setTimeout(() => {
            qualiaState.transcendence = 0; // Deactivate ultimate state
            this.eventManager.emit('ultimate_deactivated');
        }, 10000); // 10 seconds, adjust as needed
    }

    private async sendQualiaStateToBackend(qualiaState: QualiaState) {
        try {
            const response = await fetch('http://localhost:8000/update_qualia', { // Backend runs on port 8000
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
