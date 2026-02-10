import { DataAdapter } from './data/types';

export type InteractionType = 'traverse' | 'hover' | 'edit';

/**
 * Log an edge interaction for Hebbian learning
 * Tracks when users traverse, hover, or edit links between notes
 */
export async function logEdgeInteraction(
  adapter: DataAdapter,
  sourceNoteId: string,
  targetNoteId: string,
  interactionType: InteractionType
): Promise<void> {
  try {
    await adapter.graph.logEdgeInteraction(sourceNoteId, targetNoteId, interactionType);
  } catch (error) {
    console.error('Failed to log edge interaction:', error);
  }
}

/**
 * Log note access for co-access pattern detection
 * Tracks when notes are opened to calculate "fire together, wire together"
 */
export async function logNoteAccess(adapter: DataAdapter, noteId: string): Promise<void> {
  try {
    await adapter.graph.logNoteAccess(noteId);
  } catch (error) {
    console.error('Failed to log note access:', error);
  }
}

/**
 * Get edge strength data for a user
 * Returns pre-computed edge weights from local SQLite
 */
export async function getEdgeStrength(adapter: DataAdapter): Promise<Array<{
  source_note_id: string;
  target_note_id: string;
  strength: number;
}>> {
  try {
    return await adapter.graph.getEdgeStrength();
  } catch (error) {
    console.error('Failed to get edge strength:', error);
    return [];
  }
}

/**
 * Refresh the edge strength data
 * For SQLite, this might be a no-op or a local update if using materialized-view-like logic
 */
export async function refreshEdgeStrength(_adapter: DataAdapter): Promise<void> {
  // In local SQLite version, strength is calculated on demand in getEdgeStrength
  // but we keep the signature for compatibility if needed.
}
