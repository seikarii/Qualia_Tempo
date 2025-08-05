import { Component } from '../ECSManager';

export class GameState extends Component {
    gameSpeedMultiplier: number;

    constructor(gameSpeedMultiplier: number = 1.0) {
        super('GameState');
        this.gameSpeedMultiplier = gameSpeedMultiplier;
    }
}