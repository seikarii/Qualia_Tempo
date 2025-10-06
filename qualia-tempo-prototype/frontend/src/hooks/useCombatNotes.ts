/**
 * QUALIA.CODE v1.1 - useCombatNotes Hook
 * Custom hook for transforming combat notes using CombatNoteAdapter.
 * 
 * ARCHITECTURE:
 * - Encapsulates adapter logic from components
 * - Provides clean React API
 * - Maintains type safety
 */

import { useMemo } from 'react';
import { CombatNoteAdapter, type RenderedNote } from '../services/protocol/adapters/CombatNoteAdapter';
import type { NoteData } from '../types/contracts';

/**
 * Hook to transform combat notes from NoteData to RenderedNote format
 * @param noteMap Optional array of NoteData from combat data
 * @returns Memoized array of RenderedNote objects
 */
export function useCombatNotes(noteMap?: NoteData[]): RenderedNote[] {
  return useMemo(() => {
    return CombatNoteAdapter.transformCombatNotes(noteMap);
  }, [noteMap]);
}
