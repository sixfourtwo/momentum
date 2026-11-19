import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { FitnessProfile, WorkoutCategory, WorkoutLog } from '../../types';
import { CATEGORIES } from '../../config/categoryConfig';
import { useCategoryStates } from '../../hooks/useCategoryStates';
import { CategoryCard } from './CategoryCard';
import { LogWorkoutSheet } from '../sheets/LogWorkoutSheet';
import { HelpSheet } from '../sheets/HelpSheet';
import { WhatCountsSheet } from '../sheets/WhatCountsSheet';

const HINT_KEY = 'momentum.longPressHintDismissed';

type SheetState = { type: 'log' | 'help' | 'whatCounts'; category: WorkoutCategory } | null;

interface DashboardProps {
  profile: FitnessProfile;
  logs: WorkoutLog[];
  onAddLog: (log: WorkoutLog) => void;
  onDeleteLog: (id: string) => void;
}

/** Single-screen mobile dashboard: exactly three category cards (US-4.1). */
export function Dashboard({ profile, logs, onAddLog, onDeleteLog }: DashboardProps) {
  const [sheet, setSheet] = useState<SheetState>(null);
  const states = useCategoryStates(profile, logs);
  const [hintVisible, setHintVisible] = useState(() => localStorage.getItem(HINT_KEY) !== '1');

  const dismissHint = () => {
    localStorage.setItem(HINT_KEY, '1');
    setHintVisible(false);
  };

  const logsByCategory = useMemo(() => {
    const map: Record<WorkoutCategory, WorkoutLog[]> = {
      strength: [],
      cardio: [],
      mindfulness: [],
    };
    for (const log of logs) {
      map[log.category].push(log);
    }
    return map;
  }, [logs]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="flex items-baseline justify-between pb-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Momentum</h1>
        <span className="text-xs text-slate-500">Strength · Cardio · Mindfulness</span>
      </header>

      {hintVisible && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
          <span className="flex-1">Tip: press &amp; hold a card to see what counts as a workout.</span>
          <button
            type="button"
            onClick={dismissHint}
            aria-label="Dismiss hint"
            className="rounded p-0.5 text-slate-500 transition hover:text-slate-200"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {CATEGORIES.map((category) => (
        <CategoryCard
          key={category}
          category={category}
          state={states[category]}
          onLog={() => setSheet({ type: 'log', category })}
          onHelp={() => setSheet({ type: 'help', category })}
          onWhatCounts={() => {
            dismissHint();
            setSheet({ type: 'whatCounts', category });
          }}
        />
      ))}

      {sheet?.type === 'log' && (
        <LogWorkoutSheet
          category={sheet.category}
          profile={profile}
          logs={logs}
          onClose={() => setSheet(null)}
          onSubmit={onAddLog}
        />
      )}
      {sheet?.type === 'help' && (
        <HelpSheet
          category={sheet.category}
          logs={logsByCategory[sheet.category]}
          onDeleteLog={onDeleteLog}
          onOpenWhatCounts={() => setSheet({ type: 'whatCounts', category: sheet.category })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.type === 'whatCounts' && (
        <WhatCountsSheet category={sheet.category} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}
