import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GripVertical,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  PlayCircle,
  SkipForward,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Target, TargetStatus, TargetPriority, TargetType } from '@/lib/data/types';

interface TargetCardProps {
  target: Target;
  onUpdate: (id: string, updates: Partial<Target>) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}

const STATUS_CONFIG: Record<TargetStatus, { icon: React.ElementType; className: string }> = {
  pending: { icon: Circle, className: 'text-muted-foreground' },
  in_progress: { icon: PlayCircle, className: 'text-amber-500' },
  completed: { icon: CheckCircle2, className: 'text-emerald-500' },
  skipped: { icon: SkipForward, className: 'text-muted-foreground/60' },
};

const PRIORITY_CONFIG: Record<TargetPriority, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  low: { label: 'planning.priority_low', variant: 'secondary' },
  medium: { label: 'planning.priority_medium', variant: 'outline' },
  high: { label: 'planning.priority_high', variant: 'destructive' },
};

const TYPE_LABELS: Record<TargetType, string> = {
  custom: 'planning.type_custom',
  note_creation: 'planning.type_note_creation',
  research: 'planning.type_research',
  review: 'planning.type_review',
  writing: 'planning.type_writing',
  reading: 'planning.type_reading',
};

const STATUS_CYCLE: TargetStatus[] = ['pending', 'in_progress', 'completed', 'skipped'];

export function TargetCard({ target, onUpdate, onDelete, isDragging }: TargetCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(target.title);
  const [editDesc, setEditDesc] = useState(target.description || '');
  const [editMinutes, setEditMinutes] = useState(target.estimated_minutes?.toString() || '');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: target.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusConfig = STATUS_CONFIG[target.status];
  const priorityConfig = PRIORITY_CONFIG[target.priority];
  const StatusIcon = statusConfig.icon;

  const cycleStatus = () => {
    const currentIdx = STATUS_CYCLE.indexOf(target.status);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    onUpdate(target.id, { status: nextStatus });
  };

  const handleSaveEdit = () => {
    onUpdate(target.id, {
      title: editTitle,
      description: editDesc || null,
      estimated_minutes: editMinutes ? parseInt(editMinutes) : null,
    });
    setIsEditing(false);
  };

  const dragging = isDragging || isSortableDragging;

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          'group transition-all duration-200',
          dragging && 'ring-2 ring-primary/30 shadow-lg scale-[1.02] z-50',
          target.status === 'completed' && 'opacity-70',
        )}
      >
        <div className="flex items-start gap-2 p-3">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Status toggle */}
          <button
            onClick={cycleStatus}
            className={cn('mt-0.5 shrink-0 transition-colors hover:opacity-80', statusConfig.className)}
            title={t(`planning.status_${target.status}`)}
          >
            <StatusIcon className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-8 text-sm font-medium"
                  autoFocus
                />
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder={t('planning.target_description_placeholder')}
                  className="text-xs resize-none"
                  rows={2}
                />
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    value={editMinutes}
                    onChange={(e) => setEditMinutes(e.target.value)}
                    placeholder="30"
                    className="h-7 w-16 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">{t('planning.minutes')}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs">
                    {t('planning.save')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-7 text-xs">
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-sm font-medium leading-tight',
                      target.status === 'completed' && 'line-through text-muted-foreground',
                    )}
                  >
                    {target.title}
                  </span>
                  <Badge variant={priorityConfig.variant} className="h-4 text-[9px] px-1.5">
                    {t(priorityConfig.label)}
                  </Badge>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                    {t(TYPE_LABELS[target.target_type])}
                  </span>
                  {target.estimated_minutes && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {target.estimated_minutes}{t('planning.minutes')}
                    </span>
                  )}
                  {target.actual_minutes && (
                    <span className="text-[11px] text-emerald-500">
                      {target.actual_minutes}{t('planning.minutes')} actual
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Expandable description */}
            <AnimatePresence>
              {expanded && !isEditing && target.description && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {target.description}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {target.description && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setEditTitle(target.title);
                setEditDesc(target.description || '');
                setEditMinutes(target.estimated_minutes?.toString() || '');
                setIsEditing(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:text-destructive"
              onClick={() => onDelete(target.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
