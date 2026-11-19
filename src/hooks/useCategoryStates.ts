import { useEffect, useMemo, useState } from 'react';
import type { CategoryState, FitnessProfile, WorkoutCategory, WorkoutLog } from '../types';
import { calculateCategoryState } from '../domain/calculateCategoryState';

const RESYNC_INTERVAL_MS = 60_000;

/**
 * Derives live state for all three categories from timestamps only.
 * Recomputes immediately whenever the log list changes (so a freshly saved
 * workout is reflected at once), every 60s while the app is visible, and on
 * `visibilitychange` — no background timers, mobile-friendly (spec §2).
 */
export function useCategoryStates(
  profile: FitnessProfile,
  logs: WorkoutLog[],
): Record<WorkoutCategory, CategoryState> {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let intervalId: number | null = null;

    const start = () => {
      if (intervalId === null) {
        intervalId = window.setInterval(() => setNow(Date.now()), RESYNC_INTERVAL_MS);
      }
    };
    const stop = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        setNow(Date.now());
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // The mount-time `now` is stale by the time the user logs a session, and the
  // engine ignores logs dated after `now` (clock-skew guard) — so re-sync the
  // clock on every log change or the dashboard would lag until the next tick.
  useEffect(() => {
    setNow(Date.now());
  }, [logs]);

  return useMemo(() => {
    const byCategory: Record<WorkoutCategory, WorkoutLog[]> = {
      strength: [],
      cardio: [],
      mindfulness: [],
    };
    for (const log of logs) {
      byCategory[log.category].push(log);
    }
    return {
      strength: calculateCategoryState(profile.initialScores.strength, byCategory.strength, now),
      cardio: calculateCategoryState(profile.initialScores.cardio, byCategory.cardio, now),
      mindfulness: calculateCategoryState(
        profile.initialScores.mindfulness,
        byCategory.mindfulness,
        now,
      ),
    };
  }, [profile, logs, now]);
}
