import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TimeBlockItem } from './TimeBlockItem';
import type { TimeBlock, Target, TimeBlockType, CreateTimeBlockInput } from '@/lib/data/types';

interface DailyCalendarProps {
  timeBlocks: TimeBlock[];
  targets: Target[];
  dailyPlanId: string;
  onCreateTimeBlock: (input: CreateTimeBlockInput) => void;
  onUpdateTimeBlock: (id: string, updates: Partial<TimeBlock>) => void;
  onDeleteTimeBlock: (id: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0:00 - 23:00 (24-hour format)
const SLOT_HEIGHT = 64;

const BLOCK_TYPES: { value: TimeBlockType; label: string; color: string }[] = [
  { value: 'focus_work', label: 'planning.block_focus_work', color: '#6366f1' },
  { value: 'writing', label: 'planning.block_writing', color: '#f43f5e' },
  { value: 'research', label: 'planning.block_research', color: '#06b6d4' },
  { value: 'review', label: 'planning.block_review', color: '#f59e0b' },
  { value: 'planning', label: 'planning.block_planning', color: '#8b5cf6' },
  { value: 'break', label: 'planning.block_break', color: '#10b981' },
  { value: 'custom', label: 'planning.block_custom', color: '#71717a' },
];

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface NewBlockForm {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  blockType: TimeBlockType;
  title: string;
  targetId: string;
  color: string;
}

export function DailyCalendar({
  timeBlocks,
  targets,
  dailyPlanId,
  onCreateTimeBlock,
  onUpdateTimeBlock,
  onDeleteTimeBlock,
}: DailyCalendarProps) {
  const { t } = useTranslation();
  const calendarRef = useRef<HTMLDivElement>(null);
  const [showNewBlockForm, setShowNewBlockForm] = useState(false);
  const [newBlock, setNewBlock] = useState<NewBlockForm>({
    startHour: 9,
    startMinute: 0,
    endHour: 10,
    endMinute: 0,
    blockType: 'focus_work',
    title: '',
    targetId: '',
    color: '#6366f1',
  });

  const handleSlotClick = useCallback((hour: number) => {
    setNewBlock({
      startHour: hour,
      startMinute: 0,
      endHour: hour + 1,
      endMinute: 0,
      blockType: 'focus_work',
      title: '',
      targetId: '',
      color: '#6366f1',
    });
    setShowNewBlockForm(true);
  }, []);

  const handleCreateBlock = () => {
    const startTime = padTime(newBlock.startHour, newBlock.startMinute);
    const endTime = padTime(newBlock.endHour, newBlock.endMinute);

    onCreateTimeBlock({
      daily_plan_id: dailyPlanId,
      target_id: newBlock.targetId || undefined,
      start_time: startTime,
      end_time: endTime,
      block_type: newBlock.blockType,
      title: newBlock.title,
      color: newBlock.color,
    });

    setShowNewBlockForm(false);
  };

  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const nowOffset = ((currentHour) * 60 + currentMinute) / 60 * SLOT_HEIGHT;

  const targetMap = new Map(targets.map(t => [t.id, t]));

  return (
    <div className="flex flex-col h-full">
      {/* New Block Dialog */}
      <Dialog open={showNewBlockForm} onOpenChange={setShowNewBlockForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('planning.add_time_block')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <Input
              value={newBlock.title}
              onChange={(e) => setNewBlock({ ...newBlock, title: e.target.value })}
              placeholder={t('planning.block_title_placeholder')}
            />

            {/* Time range */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                  {t('planning.start_time')}
                </label>
                <div className="flex gap-1">
                  <select
                    value={newBlock.startHour}
                    onChange={(e) => setNewBlock({ ...newBlock, startHour: parseInt(e.target.value) })}
                    className="flex-1 h-9 px-2 text-sm rounded-md border border-input bg-background text-foreground"
                  >
                    {HOURS.map(h => (
                      <option key={h} value={h}>{formatHour(h)}</option>
                    ))}
                  </select>
                  <select
                    value={newBlock.startMinute}
                    onChange={(e) => setNewBlock({ ...newBlock, startMinute: parseInt(e.target.value) })}
                    className="w-16 h-9 px-2 text-sm rounded-md border border-input bg-background text-foreground"
                  >
                    {[0, 15, 30, 45].map(m => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <span className="text-muted-foreground mt-5">–</span>
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                  {t('planning.end_time')}
                </label>
                <div className="flex gap-1">
                  <select
                    value={newBlock.endHour}
                    onChange={(e) => setNewBlock({ ...newBlock, endHour: parseInt(e.target.value) })}
                    className="flex-1 h-9 px-2 text-sm rounded-md border border-input bg-background text-foreground"
                  >
                    {HOURS.map(h => (
                      <option key={h} value={h}>{formatHour(h)}</option>
                    ))}
                  </select>
                  <select
                    value={newBlock.endMinute}
                    onChange={(e) => setNewBlock({ ...newBlock, endMinute: parseInt(e.target.value) })}
                    className="w-16 h-9 px-2 text-sm rounded-md border border-input bg-background text-foreground"
                  >
                    {[0, 15, 30, 45].map(m => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Block type */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                {t('planning.block_type')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {BLOCK_TYPES.map(bt => (
                  <Button
                    key={bt.value}
                    variant={newBlock.blockType === bt.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => setNewBlock({ ...newBlock, blockType: bt.value, color: bt.color })}
                  >
                    {t(bt.label)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Link to target */}
            {targets.length > 0 && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  {t('planning.targets')}
                </label>
                <select
                  value={newBlock.targetId}
                  onChange={(e) => setNewBlock({ ...newBlock, targetId: e.target.value })}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground"
                >
                  <option value="">— None —</option>
                  {targets.filter(tgt => tgt.status !== 'completed' && tgt.status !== 'skipped').map(tgt => (
                    <option key={tgt.id} value={tgt.id}>{tgt.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBlockForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateBlock}>
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calendar grid */}
      <ScrollArea className="flex-1 pt-2" ref={calendarRef}>
        <div className="relative" style={{ height: `${HOURS.length * SLOT_HEIGHT}px` }}>
          {/* Hour lines */}
          {HOURS.map((hour, idx) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-border/50 group/slot cursor-pointer hover:bg-primary/[0.02]"
              style={{ top: `${idx * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
              onClick={() => handleSlotClick(hour)}
            >
              {/* Hour label */}
              <span className="absolute left-1 top-0 text-[10px] font-medium text-muted-foreground bg-background px-1 tabular-nums">
                {formatHour(hour)}
              </span>

              {/* Half-hour line */}
              <div
                className="absolute left-14 right-0 border-t border-dashed border-border/30"
                style={{ top: `${SLOT_HEIGHT / 2}px` }}
              />

              {/* Add button on hover */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/slot:opacity-100 transition-opacity">
                <div className="p-1 rounded-full bg-primary/10 text-primary">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}

          {/* Current time indicator */}
          {nowOffset !== null && (
            <div
              className="absolute left-12 right-0 z-20 pointer-events-none"
              style={{ top: `${nowOffset}px` }}
            >
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive -ml-1 shadow-sm" />
                <div className="flex-1 h-[2px] bg-destructive/60" />
              </div>
            </div>
          )}

          {/* Time blocks */}
          <AnimatePresence>
            {timeBlocks.map(block => (
              <TimeBlockItem
                key={block.id}
                block={block}
                targetTitle={block.target_id ? targetMap.get(block.target_id)?.title : undefined}
                slotHeight={SLOT_HEIGHT}
                startHour={0}
                onUpdate={onUpdateTimeBlock}
                onDelete={onDeleteTimeBlock}
              />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
