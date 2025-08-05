export interface NoteData {
  timestamp: number;
  position: { x: number; y: number };
  duration: number;
}

export interface LyricData {
  timestamp: number;
  text: string;
}

export interface CombatData {
  id: string;
  title: string;
  artist: string;
  audioPath: string;
  bpm: number;
  noteMap: NoteData[];
  lyrics: LyricData[];
}
