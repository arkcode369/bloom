import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note } from '@/hooks/useNotes';
import { cn } from '@/lib/utils';
import { FileText, Plus } from 'lucide-react';

interface WikilinkAutocompleteProps {
  notes: Note[];
  position: { top: number; left: number } | null;
  searchText: string;
  onSelect: (note: Note) => void;
  onCreate: (title: string) => void;
  onClose: () => void;
}

export default function WikilinkAutocomplete({
  notes,
  position,
  searchText,
  onSelect,
  onCreate,
  onClose,
}: WikilinkAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchText.toLowerCase())
  ).slice(0, 8);

  const showCreateOption = searchText.length > 0 && 
    !filteredNotes.some(n => n.title.toLowerCase() === searchText.toLowerCase());

  const totalItems = filteredNotes.length + (showCreateOption ? 1 : 0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchText]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!position) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, totalItems - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (selectedIndex < filteredNotes.length) {
            onSelect(filteredNotes[selectedIndex]);
          } else if (showCreateOption) {
            onCreate(searchText);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [position, selectedIndex, filteredNotes, showCreateOption, searchText, onSelect, onCreate, onClose, totalItems]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    
    const selectedEl = list.children[selectedIndex] as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!position || totalItems === 0) return null;

  return (
    <div
      className="fixed z-50 bg-popover border rounded-lg shadow-lg overflow-hidden min-w-[200px] max-w-[300px]"
      style={{ top: position.top, left: position.left }}
    >
      <div ref={listRef} className="max-h-[240px] overflow-y-auto py-1">
        {filteredNotes.map((note, index) => (
          <button
            key={note.id}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors',
              index === selectedIndex && 'bg-accent'
            )}
            onClick={() => onSelect(note)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{note.title}</span>
          </button>
        ))}
        
        {showCreateOption && (
          <button
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors border-t',
              selectedIndex === filteredNotes.length && 'bg-accent'
            )}
            onClick={() => onCreate(searchText)}
            onMouseEnter={() => setSelectedIndex(filteredNotes.length)}
          >
            <Plus className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">
              Create "<span className="font-medium">{searchText}</span>"
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
