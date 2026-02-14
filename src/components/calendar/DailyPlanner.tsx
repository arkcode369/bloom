import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Target as TargetIcon,
  Clock,
  BarChart3,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TargetCard } from './TargetCard';
import { DailyCalendar } from './DailyCalendar';
import { DailyReview } from './DailyReview';
import {
  useDailyPlanWithDetails,
  useCreateTarget,
  useUpdateTarget,
  useDeleteTarget,
  useReorderTargets,
  useCreateTimeBlock,
  useUpdateTimeBlock,
  useDeleteTimeBlock,
  useUpdateDailyPlan,
  usePlansInMonth,
} from '@/hooks/usePlanning';
import type { TargetPriority, TargetType, TargetStatus, DailyPlanWithDetails } from '@/lib/data/types';
import { cn } from '@/lib/utils';

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

const TARGET_TYPES: { value: TargetType; label: string }[] = [
  { value: 'custom', label: 'planning.type_custom' },
  { value: 'note_creation', label: 'planning.type_note_creation' },
  { value: 'research', label: 'planning.type_research' },
  { value: 'review', label: 'planning.type_review' },
  { value: 'writing', label: 'planning.type_writing' },
  { value: 'reading', label: 'planning.type_reading' },
];

// Mini calendar for the date picker popover
function DatePickerCalendar({
  currentMonth,
  selectedDate,
  plans,
  onMonthChange,
  onDateSelect,
}: {
  currentMonth: Date;
  selectedDate: Date;
  plans: DailyPlanWithDetails[];
  onMonthChange: (month: Date) => void;
  onDateSelect: (date: Date) => void;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const plansMap = new Map(plans.map(p => [p.plan_date, p]));

  // Pad start of month to align with weekday
  const startDay = monthStart.getDay();
  const paddedDays: (Date | null)[] = [
    ...Array.from({ length: startDay }, () => null),
    ...monthDays,
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-sm font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {paddedDays.map((day, idx) => {
          if (!day) return <div key={`pad-${idx}`} />;
          const dateStr = format(day, 'yyyy-MM-dd');
          const plan = plansMap.get(dateStr);
          const hasTargets = plan && plan.targets.length > 0;
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const isCurrent = isSameMonth(day, currentMonth);

          return (
            <button
              key={dateStr}
              onClick={() => onDateSelect(day)}
              className={cn(
                'h-8 w-full rounded-md text-xs transition-all hover:bg-muted/50 relative',
                isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                isToday && !isSelected && 'font-bold text-primary',
                !isCurrent && 'opacity-30',
              )}
            >
              {format(day, 'd')}
              {hasTargets && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function DailyPlanner() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [newTargetTitle, setNewTargetTitle] = useState('');
  const [newTargetDesc, setNewTargetDesc] = useState('');
  const [newTargetType, setNewTargetType] = useState<TargetType>('custom');
  const [newTargetPriority, setNewTargetPriority] = useState<TargetPriority>('medium');
  const [newTargetMinutes, setNewTargetMinutes] = useState('');

  const dateStr = formatDateLocal(selectedDate);
  const { data: plan, isLoading, error } = useDailyPlanWithDetails(dateStr);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [popoverMonth, setPopoverMonth] = useState(startOfMonth(selectedDate));
  const { data: popoverMonthPlans = [] } = usePlansInMonth(popoverMonth);

  const createTarget = useCreateTarget();
  const updateTarget = useUpdateTarget();
  const deleteTarget = useDeleteTarget();
  const reorderTargets = useReorderTargets();
  const createTimeBlock = useCreateTimeBlock();
  const updateTimeBlock = useUpdateTimeBlock();
  const deleteTimeBlock = useDeleteTimeBlock();
  const updateDailyPlan = useUpdateDailyPlan();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const targetIds = useMemo(() => plan?.targets.map(t => t.id) || [], [plan?.targets]);

  const goToToday = () => setSelectedDate(new Date());
  const goPrev = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const goNext = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleAddTarget = useCallback(async () => {
    if (!newTargetTitle.trim() || !plan) return;
    await createTarget.mutateAsync({
      daily_plan_id: plan.id,
      title: newTargetTitle.trim(),
      description: newTargetDesc.trim() || undefined,
      target_type: newTargetType,
      priority: newTargetPriority,
      estimated_minutes: newTargetMinutes ? parseInt(newTargetMinutes) : undefined,
    });
    setNewTargetTitle('');
    setNewTargetDesc('');
    setNewTargetType('custom');
    setNewTargetPriority('medium');
    setNewTargetMinutes('');
    setShowAddTarget(false);
  }, [newTargetTitle, newTargetDesc, newTargetType, newTargetPriority, newTargetMinutes, plan, createTarget]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !plan) return;

    const oldIndex = targetIds.indexOf(active.id as string);
    const newIndex = targetIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...targetIds];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, active.id as string);

    reorderTargets.mutate({ 
      dailyPlanId: plan.id, 
      orderedIds: newOrder 
    });
  };

  const handleUpdateTarget = (id: string, updates: Record<string, unknown>) => {
    updateTarget.mutate({ id, ...updates });
  };

  const handleDeleteTarget = (id: string) => {
    deleteTarget.mutate(id);
  };

  const completedCount = plan?.targets.filter(t => t.status === 'completed').length ?? 0;
  const totalCount = plan?.targets.length ?? 0;

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto px-6 py-8 lg:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{t('planning.daily_planner')}</h1>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button className="text-sm text-muted-foreground hover:text-foreground transition-colors underline decoration-dashed underline-offset-4 cursor-pointer">
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3" align="start">
                    <DatePickerCalendar
                      currentMonth={popoverMonth}
                      selectedDate={selectedDate}
                      plans={popoverMonthPlans}
                      onMonthChange={setPopoverMonth}
                      onDateSelect={(date) => {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={goPrev} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={isToday(selectedDate) ? 'default' : 'outline'}
                size="sm"
                onClick={goToToday}
                className="h-8 text-xs"
              >
                {t('planning.today')}
              </Button>
              <Button variant="ghost" size="icon" onClick={goNext} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Error state */}
        {error && (
          <Card className="border-destructive/50 mb-6">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">{t('error.title')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(error as Error).message}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        )}

        {/* Main content */}
        {!isLoading && plan && (
          <Tabs defaultValue="targets" className="w-full">
            <TabsList className="w-full mb-6 mt-2">
              <TabsTrigger value="targets" className="flex-1 gap-1.5">
                <TargetIcon className="h-3.5 w-3.5" />
                {t('planning.targets')}
                {totalCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 text-[10px] px-1.5">
                    {completedCount}/{totalCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex-1 gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {t('planning.time_blocks')}
              </TabsTrigger>
              <TabsTrigger value="review" className="flex-1 gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                {t('planning.daily_review')}
              </TabsTrigger>
            </TabsList>

            {/* Targets Tab */}
            <TabsContent value="targets">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Add target */}
                <motion.div variants={itemVariants} className="mb-4">
                  {showAddTarget ? (
                    <Card className="border-primary/20">
                      <CardContent className="pt-4 space-y-3">
                        <Input
                          value={newTargetTitle}
                          onChange={(e) => setNewTargetTitle(e.target.value)}
                          placeholder={t('planning.target_title_placeholder')}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddTarget();
                            }
                            if (e.key === 'Escape') setShowAddTarget(false);
                          }}
                        />
                        <Textarea
                          value={newTargetDesc}
                          onChange={(e) => setNewTargetDesc(e.target.value)}
                          placeholder={t('planning.target_description_placeholder')}
                          rows={2}
                          className="resize-none"
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={newTargetType}
                            onChange={(e) => setNewTargetType(e.target.value as TargetType)}
                            className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground"
                          >
                            {TARGET_TYPES.map(tt => (
                              <option key={tt.value} value={tt.value}>{t(tt.label)}</option>
                            ))}
                          </select>
                          <select
                            value={newTargetPriority}
                            onChange={(e) => setNewTargetPriority(e.target.value as TargetPriority)}
                            className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground"
                          >
                            <option value="low">{t('planning.priority_low')}</option>
                            <option value="medium">{t('planning.priority_medium')}</option>
                            <option value="high">{t('planning.priority_high')}</option>
                          </select>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              type="number"
                              value={newTargetMinutes}
                              onChange={(e) => setNewTargetMinutes(e.target.value)}
                              placeholder="30"
                              className="h-8 w-16 text-xs text-center"
                            />
                            <span className="text-xs text-muted-foreground">{t('planning.minutes')}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={handleAddTarget}
                            disabled={!newTargetTitle.trim() || createTarget.isPending}
                          >
                            {createTarget.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Plus className="h-3.5 w-3.5 mr-1" />
                            )}
                            {t('planning.add_target')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setShowAddTarget(false)}>
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-dashed hover:bg-primary/5 hover:border-primary/30"
                      onClick={() => setShowAddTarget(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('planning.add_target')}
                    </Button>
                  )}
                </motion.div>

                {/* Target list */}
                {plan.targets.length === 0 ? (
                  <motion.div variants={itemVariants}>
                    <Card className="border-muted/50">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                          <TargetIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t('planning.no_targets')}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1 max-w-[220px]">
                          {t('planning.no_targets_hint')}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={targetIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {plan.targets.map(target => (
                          <motion.div key={target.id} variants={itemVariants}>
                            <TargetCard
                              target={target}
                              onUpdate={handleUpdateTarget}
                              onDelete={handleDeleteTarget}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {plan.targets.length > 1 && (
                  <p className="text-center text-xs text-muted-foreground mt-4">
                    {t('planning.drag_hint')}
                  </p>
                )}
              </motion.div>
            </TabsContent>

            {/* Calendar Tab */}
            <TabsContent value="calendar" className="min-h-[600px]">
              <DailyCalendar
                timeBlocks={plan.timeBlocks}
                targets={plan.targets}
                dailyPlanId={plan.id}
                onCreateTimeBlock={(input) => createTimeBlock.mutate(input)}
                onUpdateTimeBlock={(id, updates) => updateTimeBlock.mutate({ id, ...updates })}
                onDeleteTimeBlock={(id) => deleteTimeBlock.mutate(id)}
              />
            </TabsContent>

            {/* Review Tab */}
            <TabsContent value="review">
              <DailyReview
                plan={plan}
                onUpdatePlan={(id, updates) => updateDailyPlan.mutate({ id, ...updates })}
                onUpdateTarget={(id, updates: { status?: TargetStatus; actual_minutes?: number | null }) => updateTarget.mutate({ id, ...updates })}
                onDateSelect={(date) => setSelectedDate(date)}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
