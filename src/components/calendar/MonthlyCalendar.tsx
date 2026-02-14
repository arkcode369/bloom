import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import type { DailyPlanWithDetails } from '@/lib/data/types';

interface MonthlyCalendarProps {
  plans: DailyPlanWithDetails[];
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function MonthlyCalendar({ plans, onDateSelect, selectedDate }: MonthlyCalendarProps) {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Create a map of date strings to plan data
  const plansMap = new Map(
    plans.map(plan => [plan.plan_date, plan])
  );

  const getCompletionColor = (rate: number) => {
    if (rate === 100) return 'bg-emerald-500';
    if (rate >= 80) return 'bg-amber-500';
    if (rate >= 50) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  const hasTargets = (plan: DailyPlanWithDetails | undefined) => {
    return plan && plan.targets.length > 0;
  };

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Header */}
      <Card className="border-muted/50">
        <CardContent className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card className="border-muted/50">
        <CardContent className="p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, idx) => {
              const plan = plansMap.get(format(day, 'yyyy-MM-dd'));
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <motion.div
                  key={day.toString()}
                  variants={itemVariants}
                  className={cn(
                    'aspect-[1.1] p-1 rounded-lg border transition-all hover:shadow-sm cursor-pointer hover:bg-muted/30',
                    !isCurrentMonth && 'opacity-40',
                    isSelected && 'ring-2 ring-primary bg-primary/5',
                    isToday && !isSelected && 'bg-muted/50',
                  )}
                  onClick={() => onDateSelect(day)}
                >
                  <div className="h-full flex flex-col items-center justify-between relative py-1">
                    {/* Date number */}
                    <span className={cn(
                      'text-xs font-medium',
                      isSelected && 'text-primary',
                      isToday && !isSelected && 'text-primary',
                      hasTargets(plan) && !isSelected && !isToday && 'text-foreground',
                      !hasTargets(plan) && 'text-muted-foreground'
                    )}>
                      {format(day, 'd')}
                    </span>

                    {/* Completion indicator or empty state */}
                    <div title={hasTargets(plan) ? `${plan.targets.length} target${plan.targets.length > 1 ? 's' : ''}, ${plan.timeBlocks.length} timeblock${plan.timeBlocks.length > 1 ? 's' : ''}` : 'No schedule'}>
                      {hasTargets(plan) ? (
                        <div className="mt-1 flex flex-col items-center">
                          <div className={cn(
                            'font-bold leading-none',
                            plan.completionRate === 100 ? 'text-[25px] text-emerald-600' :
                            plan.completionRate >= 80 ? 'text-[23px] text-amber-600' :
                            plan.completionRate >= 50 ? 'text-[22px] text-orange-600' : 'text-[21px] text-rose-600'
                          )}>
                            {Math.round(plan.completionRate)}%
                          </div>
                          <div className="text-[10px] text-muted-foreground leading-tight mt-1 text-center">
                            <div>{plan.targets.length} targets</div>
                            <div>{plan.timeBlocks.length} activities</div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] text-muted-foreground/50">
                          —
                        </div>
                      )}
                    </div>

                    {/* Today indicator */}
                    {isToday && (
                      <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-primary rounded-full" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-muted/50">
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">100%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">80%+</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">50%+</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-muted-foreground">&lt;50%</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
              <span>Percentage shows completion rate</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
