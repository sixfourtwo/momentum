import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import type { WorkoutCategory, WorkoutLog } from '../../types';
import { LEVELS, POINTS_PER_LEVEL, TIMING_MATRIX } from '../../config/categoryConfig';
import { formatDuration } from '../../domain/formatDuration';
import { BottomSheet } from './BottomSheet';
import { LogHistory } from './LogHistory';
import { TimingTable } from './WhatCountsSheet';

interface HelpSheetProps {
  category: WorkoutCategory;
  logs: WorkoutLog[];
  onDeleteLog: (id: string) => void;
  onOpenWhatCounts: () => void;
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

/** Per-category plain-language science copy (spec §5 research basis). */
const HELP_TEXT: Record<
  WorkoutCategory,
  Record<'rest' | 'window' | 'maintenance' | 'overtraining', string>
> = {
  strength: {
    rest: 'Muscle protein synthesis peaks ~24h after training; neural and tissue fatigue clear in ~24h (light), ~36h (moderate) and up to ~60h (hard).',
    window: 'Strength adapts best with 2+ sessions per week — inside the window you are still supercompensating.',
    maintenance:
      'Once per week is a maintenance dose, and strength resists detraining for 2–4 weeks, so decay is slower than the other pillars.',
    overtraining:
      'Light during Rest = active recovery (no penalty, timer untouched). Moderate/Hard before recovery compounds fatigue: stalled or negative progress and an extended rest timer.',
  },
  cardio: {
    rest: 'Easy Zone 2 work can repeat within 12–24h; high-intensity intervals need 24–48h before going hard again.',
    window: 'Plasma volume adapts within ~48h, and building VO2 max needs 2–3 quality sessions per week.',
    maintenance: 'Aerobic capacity fades faster than strength — mitochondrial enzymes decline within days without stimulus.',
    overtraining:
      'Light during Rest = active recovery. Stacking Moderate/Hard before recovery blunts adaptation and extends the rest timer.',
  },
  mindfulness: {
    rest: 'No muscular micro-tears means same-day sessions are physiologically safe — rest here is an integration buffer.',
    window: 'Clinical benefits rely on high frequency (4–7 days/week) — train inside the window to compound gains.',
    maintenance: 'Attention and stress benefits fade within days without regular practice.',
    overtraining:
      'Mindfulness never triggers penalties. Sessions during Rest earn no points (no gaming levels), and the timer only extends if the new session\u2019s base rest is longer.',
  },
};

/**
 * Science & Timers sheet (US-4.2): per-category rest/window matrix,
 * overtraining rules, decay, the six levels, an accessibility route to the
 * "What Counts?" guide, and recent sessions with delete (US-5.2).
 */
export function HelpSheet({ category, logs, onDeleteLog, onOpenWhatCounts, onClose }: HelpSheetProps) {
  const text = HELP_TEXT[category];

  return (
    <BottomSheet title="Science & timers" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <Section title="The cycle">
          <p className="text-sm leading-relaxed text-slate-300">
            Every session starts a <strong className="font-semibold text-slate-100">Rest</strong>{' '}
            countdown (earliest to train again), then a{' '}
            <strong className="font-semibold text-slate-100">Workout Window</strong> — the longest
            you can wait and still make gains. Miss it and progress decays.
          </p>
          <div className="mt-3">
            <TimingTable category={category} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{text.rest}</p>
        </Section>

        <Section title="Window & decay">
          <p className="text-sm leading-relaxed text-slate-300">{text.window}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {text.maintenance} Once the window is missed:{' '}
            <span className="font-medium tabular-nums text-slate-100">
              −10 immediately, then −10 every {formatDuration(TIMING_MATRIX[category].decayInterval)}
            </span>
            .
          </p>
        </Section>

        <Section title="Overtraining & active recovery">
          <p className="text-sm leading-relaxed text-slate-300">{text.overtraining}</p>
        </Section>

        <Section title="The 6 levels">
          <ol className="flex flex-col gap-1.5">
            {LEVELS.map((level, index) => (
              <li key={level.name} className="flex items-center gap-3 text-sm">
                <span className="w-12 shrink-0 text-xs tabular-nums text-slate-500">
                  {index * POINTS_PER_LEVEL}
                  {index === LEVELS.length - 1 ? '–600' : `–${(index + 1) * POINTS_PER_LEVEL - 1}`}
                </span>
                <span className="font-medium text-slate-200">{level.name}</span>
                <span className="truncate text-xs text-slate-500">{level.description}</span>
              </li>
            ))}
          </ol>
        </Section>

        <button
          type="button"
          onClick={onOpenWhatCounts}
          className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
        >
          <BookOpen size={15} />
          What counts as a workout?
        </button>

        <Section title="Recent sessions">
          <LogHistory logs={logs} onDeleteLog={onDeleteLog} />
        </Section>
      </div>
    </BottomSheet>
  );
}
