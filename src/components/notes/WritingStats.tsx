import React, { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWritingStats, getWordCount, getReadingTime } from '@/hooks/useWritingStats';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Clock, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WritingStatsProps {
  content: string | null;
  noteId?: string;
  className?: string;
}

export default function WritingStats({ content, noteId, className }: WritingStatsProps) {
  const { t } = useTranslation();
  const { preferences, progress, dailyStats, updateDailyWords } = useWritingStats();

  const wordCount = useMemo(() => getWordCount(content), [content]);
  const readingTime = useMemo(() => getReadingTime(wordCount), [wordCount]);

  useEffect(() => {
    if (noteId) {
      updateDailyWords(noteId, wordCount);
    }
  }, [noteId, wordCount, updateDailyWords]);

  if (!preferences.showWordCount && !preferences.showReadingTime) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-3 text-xs text-muted-foreground', className)}>
        {/* Word Count */}
        {preferences.showWordCount && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-default">
                <FileText className="h-3.5 w-3.5" />
                <span>{wordCount} {t('writing.words')}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('writing.word_count')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Reading Time */}
        {preferences.showReadingTime && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-default">
                <Clock className="h-3.5 w-3.5" />
                <span>{readingTime} {t('writing.min_read')}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('writing.reading_time')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Daily Progress */}
        {preferences.dailyWordGoal > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-default">
                {progress.isGoalReached ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Target className="h-3.5 w-3.5" />
                )}
                <div className="flex items-center gap-1">
                  <Progress
                    value={progress.percentage}
                    className="w-12 h-1.5"
                  />
                  <span className={cn(
                    progress.isGoalReached && 'text-primary font-medium'
                  )}>
                    {Math.round(progress.percentage)}%
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {progress.isGoalReached
                  ? t('writing.goal_reached')
                  : `${t('writing.today')}: ${dailyStats.totalWords} / ${preferences.dailyWordGoal} ${t('writing.words')}`
                }
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
