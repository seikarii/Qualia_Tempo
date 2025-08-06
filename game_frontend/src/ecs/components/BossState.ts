import { Component } from '../Component';
import { config } from '../../config';

/**
 * Represents the state of the boss.
 */
export class BossState extends Component {
    health: number;
    maxHealth: number;
    isAggressive: boolean;

    constructor(health: number = config.BOSS.MAX_HEALTH, maxHealth: number = config.BOSS.MAX_HEALTH, isAggressive: boolean = false) {
        super('BossState');
        this.health = health;
        this.maxHealth = maxHealth;
        this.isAggressive = isAggressive;
    }
}