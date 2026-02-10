import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchNotes, Note } from '@/hooks/useNotes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, FileText, Star, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { getContentPreview } from '@/components/editor/blockUtils';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNote: (noteId: string) => void;
  recentNotes?: Note[];
}

export default function SearchDialog({
  open,
  onOpenChange,
  onSelectNote,
  recentNotes = [],
}: SearchDialogProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: searchResults, isLoading } = useSearchNotes(query);

  const displayNotes = query.trim() ? searchResults : recentNotes.slice(0, 10);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchResults]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const notes = displayNotes || [];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, notes.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (notes[selectedIndex]) {
          onSelectNote(notes[selectedIndex].id);
          onOpenChange(false);
        }
        break;
    }
  }, [displayNotes, selectedIndex, onSelectNote, onOpenChange]);

  const handleSelect = (noteId: string) => {
    onSelectNote(noteId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="sr-only">{t('common.search')}</DialogTitle>
          <DialogDescription className="sr-only">
            Search for notes by title or content.
          </DialogDescription>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 h-11"
              autoFocus
            />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="px-2 pb-2">
            {isLoading && query.trim() ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : displayNotes?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {query.trim() ? t('search.no_results') : t('search.no_recent')}
              </div>
            ) : (
              <>
                {!query.trim() && displayNotes && displayNotes.length > 0 && (
                  <div className="px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('search.recent')}
                  </div>
                )}
                {displayNotes?.map((note, index) => (
                  <SearchResultItem
                    key={note.id}
                    note={note}
                    query={query}
                    isSelected={index === selectedIndex}
                    onClick={() => handleSelect(note.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  />
                ))}
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <span>↑↓ {t('search.navigate')}</span>
          <span>↵ {t('search.select')}</span>
          <span>Esc {t('search.close')}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchResultItem({
  note,
  query,
  isSelected,
  onClick,
  onMouseEnter,
}: {
  note: Note;
  query: string;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : part
    );
  };

  // Get preview text (handles both BlockNote JSON and legacy markdown)
  const getPreview = () => {
    const plainText = getContentPreview(note.content, 200);

    if (!query.trim()) {
      return plainText.slice(0, 100);
    }

    const lowerContent = plainText.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) return plainText.slice(0, 100);

    const start = Math.max(0, index - 30);
    const end = Math.min(plainText.length, index + query.length + 70);

    return (start > 0 ? '...' : '') + plainText.slice(start, end) + (end < plainText.length ? '...' : '');
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-colors',
        isSelected ? 'bg-accent' : 'hover:bg-accent/50'
      )}
    >
      <div className="flex items-start gap-3">
        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">
              {highlightText(note.title, query)}
            </span>
            {note.is_starred && (
              <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {highlightText(getPreview(), query)}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {format(new Date(note.updated_at), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
    </button>
  );
}

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
