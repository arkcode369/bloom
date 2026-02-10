import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

interface DailyWritingStats {
    date: string;
    totalWords: number;
    noteCounts: Record<string, number>;
}

interface WritingPreferences {
    dailyWordGoal: number;
    showWordCount: boolean;
    showReadingTime: boolean;
}

interface WritingStatsContextValue {
    dailyStats: DailyWritingStats;
    preferences: WritingPreferences;
    progress: {
        percentage: number;
        isGoalReached: boolean;
    };
    updateDailyWords: (noteId: string, wordCount: number) => void;
    setDailyWordGoal: (goal: number) => void;
    setShowWordCount: (show: boolean) => void;
    setShowReadingTime: (show: boolean) => void;
}

const STORAGE_KEY = 'bloom_v1_writing_stats';
const PREFS_KEY = 'bloom_v1_writing_prefs';

const defaultPreferences: WritingPreferences = {
    dailyWordGoal: 500,
    showWordCount: true,
    showReadingTime: true,
};

const WritingStatsContext = createContext<WritingStatsContextValue | undefined>(undefined);

function getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
}

export function WritingStatsProvider({ children }: { children: ReactNode }) {
    const [dailyStats, setDailyStats] = useState<DailyWritingStats>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    const today = getTodayKey();
                    if (parsed.date === today) {
                        return parsed;
                    }
                } catch { }
            }
        }
        return { date: getTodayKey(), totalWords: 0, noteCounts: {} };
    });

    const [preferences, setPreferences] = useState<WritingPreferences>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(PREFS_KEY);
            if (stored) {
                try {
                    return { ...defaultPreferences, ...JSON.parse(stored) };
                } catch { }
            }
        }
        return defaultPreferences;
    });

    // Persist daily stats
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dailyStats));
    }, [dailyStats]);

    // Persist preferences
    useEffect(() => {
        localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    }, [preferences]);

    // Reset stats if day changed (check on every mount and stats access)
    useEffect(() => {
        const today = getTodayKey();
        if (dailyStats.date !== today) {
            setDailyStats({ date: today, totalWords: 0, noteCounts: {} });
        }
    }, [dailyStats.date]);

    const updateDailyWords = useCallback((noteId: string, wordCount: number) => {
        setDailyStats(prev => {
            const today = getTodayKey();

            // If day changed, reset and start fresh with this note
            if (prev.date !== today) {
                return {
                    date: today,
                    totalWords: wordCount,
                    noteCounts: { [noteId]: wordCount },
                };
            }

            // If count is same, don't update to avoid re-renders
            if (prev.noteCounts[noteId] === wordCount) {
                return prev;
            }

            const noteCounts = { ...prev.noteCounts, [noteId]: wordCount };
            const totalWords = Object.values(noteCounts).reduce((sum, count) => sum + count, 0);

            return {
                ...prev,
                totalWords,
                noteCounts,
            };
        });
    }, []);

    const setDailyWordGoal = useCallback((goal: number) => {
        setPreferences(prev => ({ ...prev, dailyWordGoal: goal }));
    }, []);

    const setShowWordCount = useCallback((show: boolean) => {
        setPreferences(prev => ({ ...prev, showWordCount: show }));
    }, []);

    const setShowReadingTime = useCallback((show: boolean) => {
        setPreferences(prev => ({ ...prev, showReadingTime: show }));
    }, []);

    const progress = useMemo(() => {
        const goal = preferences.dailyWordGoal;
        const percentage = goal > 0 ? Math.min(100, (dailyStats.totalWords / goal) * 100) : 0;
        const isGoalReached = goal > 0 && dailyStats.totalWords >= goal;
        return { percentage, isGoalReached };
    }, [dailyStats.totalWords, preferences.dailyWordGoal]);

    const value = useMemo(() => ({
        dailyStats,
        preferences,
        progress,
        updateDailyWords,
        setDailyWordGoal,
        setShowWordCount,
        setShowReadingTime,
    }), [dailyStats, preferences, progress, updateDailyWords, setDailyWordGoal, setShowWordCount, setShowReadingTime]);

    return (
        <WritingStatsContext.Provider value={value}>
            {children}
        </WritingStatsContext.Provider>
    );
}

export function useWritingStatsContext() {
    const context = useContext(WritingStatsContext);
    if (!context) {
        throw new Error('useWritingStatsContext must be used within a WritingStatsProvider');
    }
    return context;
}
