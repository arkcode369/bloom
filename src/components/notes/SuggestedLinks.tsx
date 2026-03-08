/**
 * SuggestedLinks Panel — Phase 7: Auto-linking (Smart Wikilinks)
 * Path: src/components/notes/SuggestedLinks.tsx
 * 
 * Sidebar panel in NoteEditor showing AI-discovered related notes.
 * One-click insert wikilink. Shows relevance % and link status.
 */
import React from 'react';
import { Link2, Plus, Loader2, Sparkles } from 'lucide-react';

interface SuggestedLink {
  noteId: string;
  noteTitle: string;
  similarity: number;
  alreadyLinked: boolean;
}

interface SuggestedLinksProps {
  links: SuggestedLink[];
  isAnalyzing: boolean;
  onInsertLink: (noteId: string, noteTitle: string) => void;
  onNavigate: (noteId: string) => void;
  onRefresh: () => void;
}

export const SuggestedLinks: React.FC<SuggestedLinksProps> = ({
  links,
  isAnalyzing,
  onInsertLink,
  onNavigate,
  onRefresh,
}) => {
  if (!isAnalyzing && links.length === 0) return null;

  const getStrengthColor = (similarity: number) => {
    if (similarity >= 0.7) return 'text-emerald-500 bg-emerald-500/10';
    if (similarity >= 0.5) return 'text-amber-500 bg-amber-500/10';
    return 'text-blue-500 bg-blue-500/10';
  };

  const getStrengthLabel = (similarity: number) => {
    if (similarity >= 0.7) return 'Strong';
    if (similarity >= 0.5) return 'Medium';
    return 'Weak';
  };

  return (
    <div className="border-t border-border/40">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-violet-500" />
          <span>Related Notes</span>
          {!isAnalyzing && (
            <span className="text-[10px] text-muted-foreground/60">({links.length})</span>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          disabled={isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing...' : 'Refresh'}
        </button>
      </div>

      {/* Content */}
      {isAnalyzing ? (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Finding related notes...
        </div>
      ) : (
        <div className="px-2 pb-2 space-y-0.5">
          {links.map((link) => (
            <div
              key={link.noteId}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5
                         hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => onNavigate(link.noteId)}
            >
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{link.noteTitle}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-medium px-1 py-0 rounded ${getStrengthColor(link.similarity)}`}>
                    {Math.round(link.similarity * 100)}% {getStrengthLabel(link.similarity)}
                  </span>
                  {link.alreadyLinked && (
                    <span className="text-[10px] text-emerald-500">linked</span>
                  )}
                </div>
              </div>
              {!link.alreadyLinked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onInsertLink(link.noteId, link.noteTitle);
                  }}
                  className="opacity-0 group-hover:opacity-100 rounded p-1
                             hover:bg-accent transition-all"
                  title="Insert [[wikilink]]"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestedLinks;
