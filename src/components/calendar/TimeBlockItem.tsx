import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trash2, Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TimeBlock, TimeBlockType } from '@/lib/data/types';

interface TimeBlockItemProps {
  block: TimeBlock;
  targetTitle?: string;
  slotHeight: number;
  startHour: number;
  onUpdate: (id: string, updates: Partial<TimeBlock>) => void;
  onDelete: (id: string) => void;
}

const BLOCK_TYPE_STYLES: Record<TimeBlockType, string> = {
  focus_work: 'bg-primary/10 border-primary/25 text-primary',
  break: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
  review: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
  planning: 'bg-violet-500/10 border-violet-500/25 text-violet-600 dark:text-violet-400',
  research: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-600 dark:text-cyan-400',
  writing: 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400',
  custom: 'bg-muted border-border text-foreground',
};

const BLOCK_TYPE_LABELS: Record<TimeBlockType, string> = {
  focus_work: 'planning.block_focus_work',
  break: 'planning.block_break',
  review: 'planning.block_review',
  planning: 'planning.block_planning',
  research: 'planning.block_research',
  writing: 'planning.block_writing',
  custom: 'planning.block_custom',
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function TimeBlockItem({ block, targetTitle, slotHeight, startHour, onUpdate, onDelete }: TimeBlockItemProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(block.title);

  const startMinutes = timeToMinutes(block.start_time);
  const endMinutes = timeToMinutes(block.end_time);
  const durationMinutes = endMinutes - startMinutes;

  const topOffset = ((startMinutes - startHour * 60) / 60) * slotHeight;
  const height = (durationMinutes / 60) * slotHeight;

  const blockStyle = BLOCK_TYPE_STYLES[block.block_type] || BLOCK_TYPE_STYLES.custom;
  const isCompact = height < 48;

  const displayTitle = block.title || targetTitle || t(BLOCK_TYPE_LABELS[block.block_type]);

  const handleSave = () => {
    onUpdate(block.id, { title: editTitle });
    setIsEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'absolute left-14 right-2 rounded-md border group cursor-default overflow-hidden',
        blockStyle,
      )}
      style={{
        top: `${topOffset}px`,
        height: `${Math.max(height, 28)}px`,
        zIndex: 10,
      }}
    >
      <div className={cn('flex items-start h-full', isCompact ? 'px-2 py-0.5' : 'px-3 py-1.5')}>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={cn('flex-1 h-6 border-0 bg-transparent p-0 shadow-none', isCompact ? 'text-[11px]' : 'text-xs')}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleSave}>
                <Check className="w-3 h-3 text-emerald-500" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsEditing(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <>
              <div className={cn('font-medium truncate', isCompact ? 'text-[11px] leading-tight' : 'text-xs')}>
                {displayTitle}
              </div>
              {!isCompact && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {block.start_time} – {block.end_time}
                  <span className="ml-1.5 opacity-70">({durationMinutes}{t('planning.minutes')})</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => {
                setEditTitle(block.title);
                setIsEditing(true);
              }}
            >
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:text-destructive"
              onClick={() => onDelete(block.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Color accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
        style={{ backgroundColor: block.color }}
      />
    </motion.div>
  );
}
