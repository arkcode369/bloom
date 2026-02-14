import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Lightbulb, Link2, Tag, Network, ChevronLeft, ChevronRight, Calendar, Activity, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'bloom_tips_dismissed';

interface TipsDismissalState {
  dismissed: boolean;
  lastShown: number;
}

export default function FeatureTips() {
  const { t } = useTranslation();
  const [currentTip, setCurrentTip] = useState(0);
  const [isDismissed, setIsDismissed] = useState(true);

  const tips = [
    {
      id: 'wikilinks',
      icon: <Link2 className="h-5 w-5 text-primary" />,
      title: t('tips.connect_thoughts'),
      description: t('tips.connect_thoughts_desc'),
      example: '[[Meeting Notes]]',
    },
    {
      id: 'tags',
      icon: <Tag className="h-5 w-5 text-emerald-500" />,
      title: t('tips.organize_garden'),
      description: t('tips.organize_garden_desc'),
      example: '#project #ideas',
    },
    {
      id: 'graph',
      icon: <Network className="h-5 w-5 text-purple-500" />,
      title: t('tips.watch_grow'),
      description: t('tips.watch_grow_desc'),
    },
    {
      id: 'planner',
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
      title: t('tips.daily_planner'),
      description: t('tips.daily_planner_desc'),
    },
    {
      id: 'writing',
      icon: <Activity className="h-5 w-5 text-rose-500" />,
      title: t('tips.track_progress'),
      description: t('tips.track_progress_desc'),
    },
    {
      id: 'quick-capture',
      icon: <Zap className="h-5 w-5 text-amber-500" />,
      title: t('tips.quick_capture'),
      description: t('tips.quick_capture_desc'),
      example: 'Alt+Shift+N',
    },
  ];

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const state: TipsDismissalState = JSON.parse(stored);
        // Show tips again after 7 days
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (state.dismissed && Date.now() - state.lastShown < sevenDays) {
          setIsDismissed(true);
        } else {
          setIsDismissed(false);
        }
      } catch {
        setIsDismissed(false);
      }
    } else {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      dismissed: true,
      lastShown: Date.now(),
    }));
  };

  const nextTip = () => {
    setCurrentTip((prev) => (prev + 1) % tips.length);
  };

  const prevTip = () => {
    setCurrentTip((prev) => (prev - 1 + tips.length) % tips.length);
  };

  if (isDismissed) return null;

  const tip = tips[currentTip];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shrink-0 shadow-sm">
              {tip.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-muted-foreground">{t('tips.pro_tip')}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-2 -mt-1"
                  onClick={handleDismiss}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={tip.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="font-medium text-sm mb-1">{tip.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tip.description}
                  </p>
                  {tip.example && (
                    <code className="inline-block mt-2 px-2 py-1 bg-muted rounded text-xs font-mono text-primary">
                      {tip.example}
                    </code>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1">
                  {tips.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentTip(index)}
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        index === currentTip
                          ? 'w-4 bg-primary'
                          : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      )}
                    />
                  ))}
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={prevTip}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={nextTip}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
