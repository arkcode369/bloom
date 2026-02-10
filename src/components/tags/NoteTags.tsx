import React from 'react';
import { useNoteTags, useRemoveTagFromNote } from '@/hooks/useTags';
import TagBadge from './TagBadge';
import TagPicker from './TagPicker';
import { Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteTagsProps {
  noteId: string;
  className?: string;
  showPicker?: boolean;
}

export default function NoteTags({ noteId, className, showPicker = true }: NoteTagsProps) {
  const { data: noteTags, isLoading } = useNoteTags(noteId);
  const removeTagFromNote = useRemoveTagFromNote();

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tags = noteTags?.map(nt => nt.tag).filter(Boolean) || [];

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {tags.map(tag => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size="sm"
          onRemove={() => removeTagFromNote.mutate({ noteId, tagId: tag.id })}
        />
      ))}
      
      {showPicker && (
        <TagPicker
          noteId={noteId}
          trigger={
            <button className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Plus className="h-3 w-3" />
              {tags.length === 0 && 'Add tag'}
            </button>
          }
        />
      )}
    </div>
  );
}
