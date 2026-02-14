import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDataAdapter } from '@/lib/data/DataProvider';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ActivityCalendarProps {
  compact?: boolean; // Compact mode for home page
}

interface DayActivity {
  date: string;
  words: number;
  level: number; // 0-4 intensity level
}

export function ActivityCalendar({ compact = false }: ActivityCalendarProps) {
  const { t } = useTranslation();
  const adapter = useDataAdapter();

  // Calculate date range (current month only for compact mode)
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    
    if (compact) {
      // Current month only
      start.setDate(1);
    } else {
      // Last 12 months
      start.setMonth(start.getMonth() - 12);
    }
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [compact]);

  // Fetch writing stats from database
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['writing-stats', startDate, endDate],
    queryFn: () => adapter.writingStats.getInRange(startDate, endDate),
    staleTime: 60_000, // 1 minute
  });

  // Build activity map
  const activityMap = useMemo(() => {
    const map = new Map<string, DayActivity>();
    
    // Initialize all days in range with 0
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      map.set(dateStr, { date: dateStr, words: 0, level: 0 });
      current.setDate(current.getDate() + 1);
    }

    // Fill in actual data
    stats.forEach(stat => {
      // Calculate level based on word count (0-4)
      let level = 0;
      if (stat.total_words > 0) level = 1;
      if (stat.total_words >= 100) level = 2;
      if (stat.total_words >= 300) level = 3;
      if (stat.total_words >= 500) level = 4;

      map.set(stat.date, {
        date: stat.date,
        words: stat.total_words,
        level,
      });
    });

    return map;
  }, [stats, startDate, endDate]);

  // Group by weeks
  const weeks = useMemo(() => {
    const result: DayActivity[][] = [];
    const start = new Date(startDate);
    
    // Adjust to start from Sunday
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);

    let currentWeek: DayActivity[] = [];
    const end = new Date(endDate);
    end.setDate(end.getDate() + (6 - end.getDay())); // Complete the last week

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const activity = activityMap.get(dateStr) || { date: dateStr, words: 0, level: 0 };
      
      currentWeek.push(activity);

      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }

      current.setDate(current.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }

    return result;
  }, [activityMap, startDate, endDate]);

  // Get color for activity level
  const getLevelColor = (level: number) => {
    switch (level) {
      case 0:
        return 'bg-muted/20 hover:bg-muted/30';
      case 1:
        return 'bg-primary/20 hover:bg-primary/30';
      case 2:
        return 'bg-primary/40 hover:bg-primary/50';
      case 3:
        return 'bg-primary/60 hover:bg-primary/70';
      case 4:
        return 'bg-primary hover:bg-primary/90';
      default:
        return 'bg-muted/20 hover:bg-muted/30';
    }
  };

  // Format date for tooltip
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-16">
        <div className="text-xs text-muted-foreground">Loading activity...</div>
      </div>
    );
  }

  const totalDays = stats.filter(s => s.total_words > 0).length;
  const totalWords = stats.reduce((sum, s) => sum + s.total_words, 0);
  const currentMonth = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  if (compact) {
    // Compact mode for home page
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{currentMonth}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{totalDays}</span>
            <span>days</span>
          </div>
        </div>
        <TooltipProvider delayDuration={0}>
          <div className="flex gap-0.5">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-0.5">
                {week.map((day, dayIndex) => (
                  <Tooltip key={day.date}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'w-2 h-2 rounded-[2px] transition-colors',
                          getLevelColor(day.level)
                        )}
                        aria-label={`${day.words} words on ${formatDate(day.date)}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <div className="font-medium">{formatDate(day.date)}</div>
                        <div className="text-muted-foreground">
                          {day.words === 0 
                            ? 'No activity' 
                            : `${day.words} word${day.words === 1 ? '' : 's'}`}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </TooltipProvider>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={cn('w-2 h-2 rounded-[2px]', getLevelColor(level))}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    );
  }

  // Full mode for settings
  return (
    <div className="space-y-3">
      {/* Stats Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{totalDays}</span> days active
        </span>
        <span>•</span>
        <span>
          <span className="font-medium text-foreground">{totalWords.toLocaleString()}</span> words written
        </span>
      </div>

      {/* Calendar Grid */}
      <TooltipProvider delayDuration={0}>
        <div className="flex gap-1 overflow-x-auto pb-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        'w-3 h-3 rounded-sm transition-colors',
                        getLevelColor(day.level)
                      )}
                      aria-label={`${day.words} words on ${formatDate(day.date)}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div className="font-medium">{formatDate(day.date)}</div>
                      <div className="text-muted-foreground">
                        {day.words === 0 
                          ? 'No activity' 
                          : `${day.words} word${day.words === 1 ? '' : 's'}`}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>
      </TooltipProvider>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map(level => (
            <div
              key={level}
              className={cn('w-3 h-3 rounded-sm', getLevelColor(level))}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
