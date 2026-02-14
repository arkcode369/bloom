import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  SkipForward,
  Trophy,
  Clock,
  TrendingUp,
  MessageSquare,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { MonthlyCalendar } from './MonthlyCalendar';
import { usePlansInMonth } from '@/hooks/usePlanning';
import { format } from 'date-fns';
import type { Target, DailyPlanWithDetails, TargetStatus } from '@/lib/data/types';

interface DailyReviewProps {
  plan: DailyPlanWithDetails;
  onUpdatePlan: (id: string, updates: { review_notes?: string | null; review_completed?: boolean }) => void;
  onUpdateTarget: (id: string, updates: { status?: TargetStatus; actual_minutes?: number | null }) => void;
  onDateSelect?: (date: Date) => void;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Circle,
  in_progress: PlayCircle,
  completed: CheckCircle2,
  skipped: SkipForward,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-muted-foreground',
  in_progress: 'text-amber-500',
  completed: 'text-emerald-500',
  skipped: 'text-muted-foreground/60',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function DailyReview({ plan, onUpdatePlan, onUpdateTarget, onDateSelect }: DailyReviewProps) {
  const { t } = useTranslation();
  const [reviewNotes, setReviewNotes] = useState(plan.review_notes || '');
  const [editingActual, setEditingActual] = useState<string | null>(null);
  const [actualMinutes, setActualMinutes] = useState('');
  
  // Get plans for the current month for the calendar view
  const { data: monthPlans = [] } = usePlansInMonth(new Date(plan.plan_date));

  const totalTargets = plan.targets.length;
  const completedTargets = plan.targets.filter(tgt => tgt.status === 'completed').length;
  const skippedTargets = plan.targets.filter(tgt => tgt.status === 'skipped').length;
  const inProgressTargets = plan.targets.filter(tgt => tgt.status === 'in_progress').length;
  const completionRate = totalTargets > 0 ? Math.round((completedTargets / totalTargets) * 100) : 0;

  const totalEstimated = plan.targets.reduce((sum, tgt) => sum + (tgt.estimated_minutes || 0), 0);
  const totalActual = plan.targets.reduce((sum, tgt) => sum + (tgt.actual_minutes || 0), 0);

  const handleMarkReviewed = () => {
    onUpdatePlan(plan.id, {
      review_notes: reviewNotes || null,
      review_completed: true,
    });
  };

  const handleSaveReviewNotes = () => {
    onUpdatePlan(plan.id, { review_notes: reviewNotes || null });
  };

  const handleSaveActual = (targetId: string) => {
    const mins = actualMinutes ? parseInt(actualMinutes) : null;
    onUpdateTarget(targetId, { actual_minutes: mins });
    setEditingActual(null);
    setActualMinutes('');
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <Tabs defaultValue="review" className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="review" className="flex-1 gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            {t('planning.daily_review')}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1 gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {t('planning.calendar_view')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-6">
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center">
            <h3 className="text-lg font-semibold">{t('planning.review_title')}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{t('planning.review_subtitle')}</p>
          </motion.div>

      {/* Completion Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-muted/50">
              <CardContent className="pt-6 pb-4">
                <div className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <div className="text-center">
                      <span className={cn(
                        'text-4xl font-bold tabular-nums',
                        completionRate >= 80 ? 'text-emerald-500' :
                        completionRate >= 50 ? 'text-amber-500' : 'text-destructive'
                      )}>
                        {completionRate}%
                      </span>
                      {completionRate === 100 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: 'spring' }}
                          className="absolute -top-2 -right-6"
                        >
                          <Trophy className="w-6 h-6 text-amber-500" />
                        </motion.div>
                      )}
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 text-center">
                      {t('planning.completion_rate')}
                    </p>
                  </div>
                  <Progress
                    value={completionRate}
                    className="w-full max-w-xs h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('planning.targets_completed', { completed: completedTargets, total: totalTargets })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

      {/* Stats row */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
            <Card className="border-muted/50">
              <CardContent className="py-3 text-center">
                <div className="text-lg font-bold text-emerald-500 tabular-nums">{completedTargets}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('planning.status_completed')}</div>
              </CardContent>
            </Card>
            <Card className="border-muted/50">
              <CardContent className="py-3 text-center">
                <div className="text-lg font-bold text-amber-500 tabular-nums">{inProgressTargets}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('planning.status_in_progress')}</div>
              </CardContent>
            </Card>
            <Card className="border-muted/50">
              <CardContent className="py-3 text-center">
                <div className="text-lg font-bold text-muted-foreground tabular-nums">{skippedTargets}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('planning.status_skipped')}</div>
              </CardContent>
            </Card>
          </motion.div>

      {/* Time comparison */}
          {(totalEstimated > 0 || totalActual > 0) && (
            <motion.div variants={itemVariants}>
              <Card className="border-muted/50">
                <CardContent className="flex items-center gap-4 py-3">
                  <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('planning.time_estimated')}</div>
                      <div className="text-sm font-semibold tabular-nums">
                        {totalEstimated} {t('planning.minutes')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('planning.time_actual')}</div>
                      <div className="text-sm font-semibold tabular-nums">
                        {totalActual} {t('planning.minutes')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

      {/* Target list with actual time input */}
          <motion.div variants={itemVariants}>
            <Card className="border-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {t('planning.targets')} ({completedTargets}/{totalTargets})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {plan.targets.map((target, idx) => {
                  const Icon = STATUS_ICONS[target.status] || Circle;
                  const color = STATUS_COLORS[target.status] || 'text-muted-foreground';
                  return (
                    <motion.div
                      key={target.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Icon className={cn('w-4 h-4 shrink-0', color)} />
                      <span className={cn(
                        'flex-1 text-sm',
                        target.status === 'completed' && 'line-through text-muted-foreground',
                      )}>
                        {target.title}
                      </span>

                      {/* Actual time */}
                      <div className="flex items-center gap-1 shrink-0">
                        {editingActual === target.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={actualMinutes}
                              onChange={(e) => setActualMinutes(e.target.value)}
                              className="w-14 h-7 text-xs text-center"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveActual(target.id);
                                if (e.key === 'Escape') setEditingActual(null);
                              }}
                            />
                            <span className="text-[10px] text-muted-foreground">{t('planning.minutes')}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingActual(target.id);
                              setActualMinutes(target.actual_minutes?.toString() || '');
                            }}
                            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            title={t('planning.actual_time')}
                          >
                            <Clock className="w-3 h-3" />
                            {target.actual_minutes ? `${target.actual_minutes}m` : '—'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

      {/* Review notes */}
          <motion.div variants={itemVariants}>
            <Card className="border-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  {t('planning.daily_review')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  onBlur={handleSaveReviewNotes}
                  placeholder={t('planning.review_notes_placeholder')}
                  className="resize-none"
                  rows={4}
                  disabled={plan.review_completed}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Mark as reviewed */}
          <motion.div variants={itemVariants}>
            {!plan.review_completed ? (
              <Button className="w-full" onClick={handleMarkReviewed}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t('planning.mark_reviewed')}
              </Button>
            ) : (
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="flex items-center justify-center gap-2 py-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {t('planning.already_reviewed')}
                  </span>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="calendar">
          <MonthlyCalendar
            plans={monthPlans}
            selectedDate={new Date(plan.plan_date)}
            onDateSelect={(date) => {
              if (onDateSelect) {
                onDateSelect(date);
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
