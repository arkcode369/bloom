import React from 'react';
import { Tag, Sparkles, Plus, X, Loader2 } from 'lucide-react';

interface TagSuggestionItem {
  name: string;
  confidence: number;
  isExisting: boolean;
  existingId?: string;
}

interface TagSuggestionProps {
  suggestions: TagSuggestionItem[];
  isAnalyzing: boolean;
  onAccept: (tag: TagSuggestionItem) => void;
  onReject: (tag: TagSuggestionItem) => void;
  onAcceptAll: () => void;
  onDismiss: () => void;
}

export const TagSuggestion: React.FC<TagSuggestionProps> = ({
  suggestions,
  isAnalyzing,
  onAccept,
  onReject,
  onAcceptAll,
  onDismiss,
}) => {
  if (!isAnalyzing && suggestions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-t border-border/40 bg-muted/20">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3 text-amber-500" />
        <span>AI Tags:</span>
      </div>

      {isAnalyzing ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Analyzing...</span>
        </div>
      ) : (
        <>
          {suggestions.map((tag) => (
            <div
              key={tag.name}
              className="group flex items-center gap-0.5 rounded-full border px-2 py-0.5
                         text-xs font-medium transition-colors cursor-pointer
                         border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300
                         hover:bg-amber-500/15"
            >
              <Tag className="h-2.5 w-2.5" />
              <span>{tag.name}</span>
              <span className="text-[10px] text-muted-foreground ml-0.5">
                {Math.round(tag.confidence * 100)}%
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onAccept(tag); }}
                className="ml-0.5 rounded-full p-0.5 hover:bg-emerald-500/20"
                title="Accept tag"
              >
                <Plus className="h-2.5 w-2.5 text-emerald-600" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onReject(tag); }}
                className="rounded-full p-0.5 hover:bg-red-500/20"
                title="Reject tag"
              >
                <X className="h-2.5 w-2.5 text-red-500" />
              </button>
            </div>
          ))}

          {suggestions.length > 0 && (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={onAcceptAll}
                className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Accept all
              </button>
              <span className="text-muted-foreground/30">|</span>
              <button
                onClick={onDismiss}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TagSuggestion;
