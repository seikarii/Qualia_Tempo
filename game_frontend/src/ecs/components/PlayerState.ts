import { Component } from '../ECSManager';

export class PlayerState extends Component {
    health: number;
    maxHealth: number;
    dashCharges: number;
    maxDashCharges: number;

    constructor(health: number = 100, maxHealth: number = 100, dashCharges: number = 3, maxDashCharges: number = 3) {
        super('PlayerState');
        this.health = health;
        this.maxHealth = maxHealth;
        this.dashCharges = dashCharges;
        this.maxDashCharges = maxDashCharges;
    }
}