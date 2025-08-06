import { Component } from '../Component';

export class GameState extends Component {
    gameSpeedMultiplier: number;

    constructor(gameSpeedMultiplier: number = 1.0) {
        super('GameState');
        this.gameSpeedMultiplier = gameSpeedMultiplier;
    }
}