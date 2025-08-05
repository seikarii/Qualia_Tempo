import { Component } from '../ECSManager';

export class BossState extends Component {
    health: number;
    maxHealth: number;
    isAggressive: boolean;

    constructor(health: number = 1000, maxHealth: number = 1000, isAggressive: boolean = false) {
        super('BossState');
        this.health = health;
        this.maxHealth = maxHealth;
        this.isAggressive = isAggressive;
    }
}