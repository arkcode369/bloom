import { useCallback } from 'react';
import { useDataAdapter } from '@/lib/data/DataProvider';
import { 
  logEdgeInteraction as logEdgeInteractionLib, 
  logNoteAccess as logNoteAccessLib,
  InteractionType 
} from '@/lib/graphInteractions';

export function useGraphInteractions() {
  const adapter = useDataAdapter();

  const logEdgeInteraction = useCallback(async (
    sourceNoteId: string,
    targetNoteId: string,
    interactionType: InteractionType
  ) => {
    await logEdgeInteractionLib(adapter, sourceNoteId, targetNoteId, interactionType);
  }, [adapter]);

  const logNoteAccess = useCallback(async (noteId: string) => {
    await logNoteAccessLib(adapter, noteId);
  }, [adapter]);

  return {
    logEdgeInteraction,
    logNoteAccess,
  };
}
