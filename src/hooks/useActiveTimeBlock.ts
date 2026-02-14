import { useState, useEffect, useMemo } from 'react';
import { useDailyPlanWithDetails } from './usePlanning';
import type { TimeBlock, Target } from '@/lib/data/types';

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getCurrentSeconds(): number {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

export interface ActiveTimeBlockInfo {
  block: TimeBlock | null;
  nextBlock: TimeBlock | null;
  remainingSeconds: number;
  totalSeconds: number;
  progress: number; // 0-100
  targets: Target[];
  isActive: boolean;
}

export function useActiveTimeBlock(): ActiveTimeBlockInfo {
  const today = formatDateLocal(new Date());
  const { data: plan } = useDailyPlanWithDetails(today);
  const [tick, setTick] = useState(0);

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const result = useMemo((): ActiveTimeBlockInfo => {
    if (!plan || !plan.timeBlocks.length) {
      return {
        block: null,
        nextBlock: null,
        remainingSeconds: 0,
        totalSeconds: 0,
        progress: 0,
        targets: [],
        isActive: false,
      };
    }

    const nowMinutes = getCurrentMinutes();
    const nowSeconds = getCurrentSeconds();

    // Sort blocks by start time
    const sorted = [...plan.timeBlocks].sort(
      (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );

    // Find active block
    let activeBlock: TimeBlock | null = null;
    let nextBlock: TimeBlock | null = null;

    for (let i = 0; i < sorted.length; i++) {
      const block = sorted[i];
      const startMin = timeToMinutes(block.start_time);
      const endMin = timeToMinutes(block.end_time);

      if (nowMinutes >= startMin && nowMinutes < endMin) {
        activeBlock = block;
        nextBlock = sorted[i + 1] || null;
        break;
      } else if (startMin > nowMinutes) {
        nextBlock = block;
        break;
      }
    }

    if (!activeBlock) {
      return {
        block: null,
        nextBlock,
        remainingSeconds: 0,
        totalSeconds: 0,
        progress: 0,
        targets: plan.targets,
        isActive: false,
      };
    }

    const startSeconds = timeToMinutes(activeBlock.start_time) * 60;
    const endSeconds = timeToMinutes(activeBlock.end_time) * 60;
    const totalSeconds = endSeconds - startSeconds;
    const elapsedSeconds = nowSeconds - startSeconds;
    const remainingSeconds = Math.max(0, endSeconds - nowSeconds);
    const progress = totalSeconds > 0 ? Math.min(100, (elapsedSeconds / totalSeconds) * 100) : 0;

    return {
      block: activeBlock,
      nextBlock,
      remainingSeconds,
      totalSeconds,
      progress,
      targets: plan.targets,
      isActive: true,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, tick]);

  return result;
}
