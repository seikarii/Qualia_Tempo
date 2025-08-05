import { Component } from '../ECSManager';

export class NoteComponent extends Component {
    position: { x: number; y: number };
    spawnTime: number; // Timestamp when the note should appear
    duration: number; // How long the note stays active
    color: string; // Color of the note
    hit: boolean; // Whether the note has been hit by the player

    constructor(position: { x: number; y: number }, spawnTime: number, duration: number, color: string, hit: boolean = false) {
        super('NoteComponent');
        this.position = position;
        this.spawnTime = spawnTime;
        this.duration = duration;
        this.color = color;
        this.hit = hit;
    }
}