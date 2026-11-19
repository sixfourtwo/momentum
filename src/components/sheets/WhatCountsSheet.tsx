import type { WorkoutCategory, WorkoutDifficulty } from '../../types';
import { CATEGORY_META, DIFFICULTY_META, TIMING_MATRIX } from '../../config/categoryConfig';
import { formatDuration } from '../../domain/formatDuration';
import { BottomSheet } from './BottomSheet';

const DIFFICULTIES: WorkoutDifficulty[] = ['light', 'moderate', 'hard'];

interface WhatCountsSheetProps {
  category: WorkoutCategory;
  onClose: () => void;
}

/** Long-press guide (US-4.3): what qualifies, what doesn't, and effort examples. */
export function WhatCountsSheet({ category, onClose }: WhatCountsSheetProps) {
  const meta = CATEGORY_META[category];

  return (
    <BottomSheet title={`What counts — ${meta.label}?`} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-400">
            Qualifies
          </h3>
          <p className="text-sm leading-relaxed text-slate-300">{meta.copy.qualifies}</p>
        </section>

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rose-400">
            Doesn't count
          </h3>
          <p className="text-sm leading-relaxed text-slate-300">{meta.copy.doesntCount}</p>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Examples by effort
          </h3>
          <div className="flex flex-col gap-2">
            {DIFFICULTIES.map((difficulty) => (
              <div key={difficulty} className="flex gap-3 rounded-2xl bg-slate-800/40 px-4 py-3">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DIFFICULTY_META[difficulty].dot}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {DIFFICULTY_META[difficulty].label}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-400">
                    {meta.copy.examples[difficulty]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </BottomSheet>
  );
}

/** Compact rest/window table used inside the Science & Timers sheet. */
export function TimingTable({ category }: { category: WorkoutCategory }) {
  const timers = TIMING_MATRIX[category].timers;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/60 text-[11px] uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Felt</th>
            <th className="px-3 py-2 text-center font-medium">Rest</th>
            <th className="px-3 py-2 text-center font-medium">Window</th>
          </tr>
        </thead>
        <tbody>
          {DIFFICULTIES.map((difficulty) => (
            <tr key={difficulty} className="border-t border-slate-800">
              <td className="px-3 py-2">
                <span className="flex items-center gap-2 text-slate-200">
                  <span className={`h-2 w-2 rounded-full ${DIFFICULTY_META[difficulty].dot}`} />
                  {DIFFICULTY_META[difficulty].label}
                </span>
              </td>
              <td className="px-3 py-2 text-center tabular-nums text-slate-200">
                {formatDuration(timers[difficulty].rest)}
              </td>
              <td className="px-3 py-2 text-center tabular-nums text-slate-200">
                {formatDuration(timers[difficulty].window)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
