/**
 * QUALIA.CODE v1.1 - CombatNoteAdapter
 * Adapter for transforming CombatData NoteData to renderable Note format.
 * 
 * ARCHITECTURE:
 * - Stateless transformation - no side effects
 * - Single Responsibility - only transforms note data structure
 * - Testable - pure functions, no dependencies on external state
 */

import type { NoteData } from '../../../types/contracts';

/**
 * Note type for renderer compatibility
 */
export interface RenderedNote {
  id: string;
  type: string;
  timing: number;
  position: [number, number, number];
  qualia_signature: string;
}

/**
 * CombatNoteAdapter - Transforms combat note data to renderable format
 */
export class CombatNoteAdapter {
  /**
   * Transform an array of NoteData from combat data to renderable Note format
   * @param noteMap Array of NoteData from combat data
   * @returns Array of RenderedNote objects ready for rendering
   */
  public static transformCombatNotes(noteMap?: NoteData[]): RenderedNote[] {
    if (!noteMap) {
      return [];
    }

    return noteMap.map((noteData: NoteData) => ({
      id: `note_${noteData.timestamp}_${noteData.position.x}_${noteData.position.y}`,
      type: "musical_note", // Default type for all notes
      timing: noteData.timestamp,
      position: [
        noteData.position.x,
        noteData.position.y,
        0, // Z position - can be calculated based on timing or other factors
      ] as [number, number, number],
      qualia_signature: `signature_${Math.floor(noteData.timestamp)}`, // Generate based on timing
    }));
  }

  /**
   * Transform a single NoteData to RenderedNote
   * @param noteData Single NoteData to transform
   * @returns RenderedNote object
   */
  public static transformSingleNote(noteData: NoteData): RenderedNote {
    return {
      id: `note_${noteData.timestamp}_${noteData.position.x}_${noteData.position.y}`,
      type: "musical_note",
      timing: noteData.timestamp,
      position: [
        noteData.position.x,
        noteData.position.y,
        0,
      ] as [number, number, number],
      qualia_signature: `signature_${Math.floor(noteData.timestamp)}`,
    };
  }
}
