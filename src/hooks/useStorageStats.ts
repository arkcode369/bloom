import { useMemo } from 'react';
import { useNotes } from '@/hooks/useNotes';

export interface NoteStorageStats {
  noteId: string;
  title: string;
  sizeBytes: number;
  sizeFormatted: string;
  percentage: number;
}

export interface StorageStats {
  totalBytes: number;
  totalFormatted: string;
  noteStats: NoteStorageStats[];
  isLoading: boolean;
}

const encoder = new TextEncoder();

function getByteLength(str: string | null | undefined): number {
  if (!str) return 0;
  return encoder.encode(str).length;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function useStorageStats(): StorageStats {
  const { data: notes, isLoading } = useNotes();

  const stats = useMemo(() => {
    if (!notes || notes.length === 0) {
      return {
        totalBytes: 0,
        totalFormatted: '0 B',
        noteStats: [],
        isLoading,
      };
    }

    // Calculate size for each note
    const noteStats: NoteStorageStats[] = notes.map(note => {
      const titleBytes = getByteLength(note.title);
      const contentBytes = getByteLength(note.content);
      const totalBytes = titleBytes + contentBytes;

      return {
        noteId: note.id,
        title: note.title,
        sizeBytes: totalBytes,
        sizeFormatted: formatBytes(totalBytes),
        percentage: 0, // Will be calculated after total is known
      };
    });

    // Sort by size descending
    noteStats.sort((a, b) => b.sizeBytes - a.sizeBytes);

    // Calculate total
    const totalBytes = noteStats.reduce((sum, note) => sum + note.sizeBytes, 0);

    // Calculate percentages
    noteStats.forEach(note => {
      note.percentage = totalBytes > 0 ? (note.sizeBytes / totalBytes) * 100 : 0;
    });

    return {
      totalBytes,
      totalFormatted: formatBytes(totalBytes),
      noteStats,
      isLoading,
    };
  }, [notes, isLoading]);

  return stats;
}
