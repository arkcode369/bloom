import { Note } from "@/hooks/useNotes";

export interface WikilinkSuggestionItem {
  title: string;
  noteId: string | null;
  isCreate?: boolean;
}

export function getWikilinkSuggestionItems(
  notes: Note[],
  query: string
): WikilinkSuggestionItem[] {
  const lowerQuery = query.toLowerCase();
  
  // Filter existing notes
  const matchingNotes = notes
    .filter((note) => note.title.toLowerCase().includes(lowerQuery))
    .slice(0, 8)
    .map((note) => ({
      title: note.title,
      noteId: note.id,
      isCreate: false,
    }));
  
  // Check if we should show "Create new note" option
  const exactMatch = notes.some(
    (note) => note.title.toLowerCase() === lowerQuery
  );
  
  if (query.length > 0 && !exactMatch) {
    matchingNotes.push({
      title: query,
      noteId: null,
      isCreate: true,
    });
  }
  
  return matchingNotes;
}
