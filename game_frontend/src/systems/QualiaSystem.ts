import { getComponentForEntity } from '../utils/ecsUtils';

// ... (resto del código)

    update(deltaTime: number): void {
        const qualiaState: QualiaState | undefined = getComponentForEntity(this.ecs, QualiaState);
        const bossState: BossState | undefined = getComponentForEntity(this.ecs, BossState);
        const gameState: GameState | undefined = getComponentForEntity(this.ecs, GameState);

        if (!qualiaState || !bossState || !gameState) {
            return;
        }

        // --- Qualia State Calculations ---
        // Precision: Based on combo
        qualiaState.precision = Math.min(config.QUALIA_SYSTEM.COMBO_MULTIPLIER, this.comboCount / config.QUALIA_SYSTEM.MAX_COMBO);

        // Aggression: Influenced by Fast Forward and high combo
        qualiaState.aggression = Math.min(config.QUALIA_SYSTEM.COMBO_MULTIPLIER, this.comboCount / config.QUALIA_SYSTEM.NOTE_HIT_THRESHOLD);

        // Flow: Based on successful rhythmic dashes
        qualiaState.flow = this.dashAttemptCount > 0 ? (this.dashSuccessCount / this.dashAttemptCount) : 0;

        // Chaos: Based on missed notes and failed dashes
        qualiaState.chaos = Math.min(config.QUALIA_SYSTEM.COMBO_MULTIPLIER, (this.comboCount === 0 && this.dashAttemptCount > 0 && this.dashSuccessCount < this.dashAttemptCount) ? 1 : 0);

        // Intensity: Weighted sum of other Qualia types
        qualiaState.intensity = (qualiaState.precision * config.QUALIA_SYSTEM.NOTE_MISS_THRESHOLD + qualiaState.aggression * config.QUALIA_SYSTEM.DASH_SUCCESS_THRESHOLD + qualiaState.flow * config.QUALIA_SYSTEM.DASH_FAIL_THRESHOLD + qualiaState.recovery * config.QUALIA_SYSTEM.ABILITY_PAUSE_THRESHOLD + qualiaState.transcendence * config.QUALIA_SYSTEM.ABILITY_FAST_FORWARD_THRESHOLD);
        qualiaState.intensity = Math.min(config.QUALIA_SYSTEM.COMBO_MULTIPLIER, Math.max(0, qualiaState.intensity));

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
        const qualiaState: QualiaState | undefined = getComponentForEntity(this.ecs, QualiaState);
        if (!qualiaState) return;

        this.comboCount++;
    }

    /**
     * Handles the player miss note event.
     */
    private handlePlayerMissNote() {
        const qualiaState: QualiaState | undefined = getComponentForEntity(this.ecs, QualiaState);
        if (!qualiaState) return;

        this.comboCount = 0; // Reset combo on miss
    }

    /**
     * Handles the ability pause event.
     */
    private handleAbilityPause() {
        const gameState: GameState | undefined = getComponentForEntity(this.ecs, GameState);
        if (!gameState) return;

        const originalGameSpeed = gameState.gameSpeedMultiplier;
        gameState.gameSpeedMultiplier = config.QUALIA_SYSTEM.DASH_FAIL_THRESHOLD; // 20% speed
        setTimeout(() => {
            gameState.gameSpeedMultiplier = originalGameSpeed;
        }, config.QUALIA_SYSTEM.SEND_STATE_INTERVAL); // 0.2 seconds
        this.eventManager.emit('game_speed_changed', { multiplier: gameState.gameSpeedMultiplier });
        
        const qualiaState: QualiaState | undefined = getComponentForEntity(this.ecs, QualiaState);
        if (qualiaState) {
            qualiaState.precision = Math.min(config.QUALIA_SYSTEM.COMBO_MULTIPLIER, qualiaState.precision + config.QUALIA_SYSTEM.ABILITY_PAUSE_THRESHOLD); // Example increase
        }
    }

    /**
     * Handles the ability fast forward event.
     */
    private handleAbilityFastForward() {
        const qualiaState: QualiaState | undefined = getComponentForEntity(this.ecs, QualiaState);
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
        const playerState: PlayerState | undefined = getComponentForEntity(this.ecs, PlayerState);
        if (!playerState) return;

        playerState.health = Math.min(playerState.maxHealth, playerState.health + playerState.maxHealth * config.QUALIA_SYSTEM.DASH_FAIL_THRESHOLD); // Restore 20% health
        playerState.dashCharges = Math.min(playerState.maxDashCharges, playerState.dashCharges + config.QUALIA_SYSTEM.COMBO_MULTIPLIER); // Restore 1 dash charge
        this.eventManager.emit('player_rewind_activated', { health: playerState.health, dashCharges: playerState.dashCharges });

        const qualiaState: QualiaState | undefined = getComponentForEntity(this.ecs, QualiaState);
        if (qualiaState) {
            qualiaState.recovery = Math.min(config.QUALIA_SYSTEM.COMBO_MULTIPLIER, qualiaState.recovery + config.QUALIA_SYSTEM.DASH_FAIL_THRESHOLD); // Example increase
        }
    }

    /**
     * Handles the ability ultimate event.
     */
    private handleAbilityUltimate() {
        const qualiaState: QualiaState | undefined = getComponentForEntity(this.ecs, QualiaState);
        if (!qualiaState) return;

        qualiaState.transcendence = config.QUALIA_SYSTEM.COMBO_MULTIPLIER; // Activate ultimate state

        // Emit events for visual/audio changes (8D audio, Charlie's voice, floor movement)
        this.eventManager.emit('ultimate_activated_audio_visual', undefined);
        this.eventManager.emit('ultimate_activated_gameplay_intensity', undefined);

        setTimeout(() => {
            qualiaState.transcendence = 0; // Deactivate ultimate state
            this.eventManager.emit('ultimate_deactivated', undefined);
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
