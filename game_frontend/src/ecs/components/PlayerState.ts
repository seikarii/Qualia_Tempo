import { Component } from '../Component';
import { config } from '../../config';

/**
 * Represents the state of the player.
 */
export class PlayerState extends Component {
    health: number;
    maxHealth: number;
    dashCharges: number;
    maxDashCharges: number;

    constructor(health: number = config.PLAYER.MAX_HEALTH, maxHealth: number = config.PLAYER.MAX_HEALTH, dashCharges: number = config.PLAYER.MAX_DASH_COMBO, maxDashCharges: number = config.PLAYER.MAX_DASH_COMBO) {
        super('PlayerState');
        this.health = health;
        this.maxHealth = maxHealth;
        this.dashCharges = dashCharges;
        this.maxDashCharges = maxDashCharges;
    }
}