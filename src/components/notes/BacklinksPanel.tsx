import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBacklinks, BacklinkWithNote } from '@/hooks/useLinks';
import { cn } from '@/lib/utils';
import { Link2, FileText, Loader2, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BacklinksPanelProps {
  noteId: string;
  onNavigate: (noteId: string) => void;
  className?: string;
}

export default function BacklinksPanel({ noteId, onNavigate, className }: BacklinksPanelProps) {
  const { t } = useTranslation();
  const { data: backlinks, isLoading } = useBacklinks(noteId);

  if (isLoading) {
    return (
      <div className={cn('p-4', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (!backlinks?.length) {
    return (
      <div className={cn('p-4', className)}>
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('notes.backlinks')}</span>
        </div>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>{t('notes.no_backlinks')}</p>
          <p className="text-xs">
            💡 <span className="font-medium">Tip:</span>{' '}
            {t('notes.backlinks_tip')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Link2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {backlinks.length} {t('notes.backlinks')}
        </span>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {backlinks.map(({ link, sourceNote, context }) => (
            <button
              key={link.id}
              onClick={() => onNavigate(sourceNote.id)}
              className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm truncate flex-1">
                  {sourceNote.title}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {context && (
                <p className="text-xs text-muted-foreground line-clamp-2 pl-6">
                  {highlightWikilink(context)}
                </p>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function highlightWikilink(text: string): React.ReactNode {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  
  return parts.map((part, i) => {
    if (part.match(/^\[\[[^\]]+\]\]$/)) {
      return (
        <span key={i} className="text-primary font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}
