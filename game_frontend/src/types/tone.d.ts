declare module 'tone' {
    export class Player {
        constructor(options?: any);
        toDestination(): any;
        start(): void;
        stop(): void;
        loaded: Promise<void>;
        url: { value: string };
        volume: { value: number };
    }

    export class Panner3D {
        constructor();
        toDestination(): any;
        positionX: { value: number };
        positionY: { value: number };
        positionZ: { value: number };
        orientationX: { value: number };
        orientationY: { value: number };
        orientationZ: { value: number };
    }

    export const Transport: { 
        bpm: { value: number };
        start(): void;
        stop(): void;
    };

    export function start(): Promise<void>;
}
