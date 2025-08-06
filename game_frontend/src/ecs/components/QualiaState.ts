import { Component } from '../Component';

/**
 * Represents the state of the Qualia.
 */
export class QualiaState extends Component {
    intensity: number;
    precision: number;
    aggression: number;
    flow: number;
    chaos: number;
    recovery: number;
    transcendence: number;

    constructor(intensity: number = 0, precision: number = 0, aggression: number = 0, flow: number = 0, chaos: number = 0, recovery: number = 0, transcendence: number = 0) {
        super('QualiaState');
        this.intensity = intensity;
        this.precision = precision;
        this.aggression = aggression;
        this.flow = flow;
        this.chaos = chaos;
        this.recovery = recovery;
        this.transcendence = transcendence;
    }
}
