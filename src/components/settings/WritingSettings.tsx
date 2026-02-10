import React from 'react';
import { useTranslation } from 'react-i18next';
import { useWritingStats } from '@/hooks/useWritingStats';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Target, FileText, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WritingSettings() {
  const { t } = useTranslation();
  const { preferences, progress, dailyStats, setDailyWordGoal, setShowWordCount, setShowReadingTime } = useWritingStats();

  return (
    <div className="space-y-6">
      {/* Daily Progress Card */}
      <section className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-transparent border">
        <div className="flex items-center gap-3 mb-3">
          {progress.isGoalReached ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Target className="h-5 w-5 text-muted-foreground" />
          )}
          <div className="flex-1">
            <h3 className="text-sm font-medium">{t('writing.today')}</h3>
            <p className="text-xs text-muted-foreground">
              {dailyStats.totalWords} / {preferences.dailyWordGoal} {t('writing.words')}
            </p>
          </div>
          <span className={cn(
            "text-lg font-semibold",
            progress.isGoalReached && "text-primary"
          )}>
            {Math.round(progress.percentage)}%
          </span>
        </div>
        <Progress value={progress.percentage} className="h-2" />
        {progress.isGoalReached && (
          <p className="text-xs text-primary mt-2 font-medium">
            🎉 {t('writing.goal_reached')}
          </p>
        )}
      </section>

      {/* Daily Word Goal */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              {t('writing.daily_goal')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('writing.daily_goal_hint')}
            </p>
          </div>
          <span className="text-sm font-medium bg-muted px-2 py-1 rounded">
            {preferences.dailyWordGoal} {t('writing.words')}
          </span>
        </div>
        <Slider
          value={[preferences.dailyWordGoal]}
          onValueChange={([value]) => setDailyWordGoal(value)}
          min={100}
          max={2000}
          step={50}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>100</span>
          <span>500</span>
          <span>1000</span>
          <span>1500</span>
          <span>2000</span>
        </div>
      </section>

      <Separator />

      {/* Display Settings */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="show-word-count">{t('writing.show_word_count')}</Label>
          </div>
          <Switch
            id="show-word-count"
            checked={preferences.showWordCount}
            onCheckedChange={setShowWordCount}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="show-reading-time">{t('writing.show_reading_time')}</Label>
          </div>
          <Switch
            id="show-reading-time"
            checked={preferences.showReadingTime}
            onCheckedChange={setShowReadingTime}
          />
        </div>
      </section>
    </div>
  );
}
