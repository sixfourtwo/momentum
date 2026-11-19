import { HelpCircle, Plus } from 'lucide-react';
import type { CategoryState, CategoryStatus, WorkoutCategory } from '../../types';
import { CATEGORY_META, STATUS_META } from '../../config/categoryConfig';
import { CATEGORY_UI } from '../../config/categoryUi';
import { useLongPress } from '../../hooks/useLongPress';
import { formatDuration } from '../../domain/formatDuration';
import { CircularProgress } from './CircularProgress';
import { DepletingBar } from './DepletingBar';

const STATUS_CHIP: Record<CategoryStatus, string> = {
  ready: 'bg-slate-800 text-slate-300',
  rest: 'bg-amber-500/15 text-amber-300',
  window: 'bg-emerald-500/20 text-emerald-300',
  missed: 'bg-rose-500/15 text-rose-300',
};

interface CategoryCardProps {
  category: WorkoutCategory;
  state: CategoryState;
  onLog: () => void;
  onHelp: () => void;
  onWhatCounts: () => void;
}

/**
 * One dashboard card: header (title, level, help), body (progress ring +
 * status block with depleting bar), and a + Log action. Short tap opens the
 * Log sheet; press-and-hold opens the "What Counts?" guide.
 */
export function CategoryCard({ category, state, onLog, onHelp, onWhatCounts }: CategoryCardProps) {
  const ui = CATEGORY_UI[category];
  const meta = CATEGORY_META[category];
  const statusMeta = STATUS_META[state.status];

  const longPress = useLongPress({
    onLongPress: onWhatCounts,
    onClick: onLog,
    ignoreSelector: '[data-card-ignore]',
  });

  const subtext =
    state.status === 'rest' && state.consecutiveRestViolations > 0
      ? 'Recovery debt extended'
      : state.status === 'missed' && state.remainingMs !== null
        ? `Next drop in ${formatDuration(state.remainingMs)}`
        : statusMeta.subtext;

  return (
    <article
      {...longPress}
      role="button"
      tabIndex={0}
      aria-label={`${meta.label}: level ${state.level} ${state.levelName}, ${statusMeta.label}. Tap to log a workout, hold for examples.`}
      className="flex touch-pan-y select-none flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 outline-none [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-slate-500"
    >
      <div className="flex items-center gap-2.5">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${ui.chip}`}>
          <ui.Icon size={18} strokeWidth={2.2} />
        </span>
        <h2 className="text-base font-semibold text-slate-100">{meta.label}</h2>
        <span className="ml-auto rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300">
          Lvl {state.level} · {state.levelName}
        </span>
        <button
          type="button"
          data-card-ignore
          aria-label={`How ${meta.label} timers work`}
          onClick={onHelp}
          className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
        >
          <HelpCircle size={17} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <CircularProgress
          percent={state.ringPercent}
          gradientId={`ring-${category}`}
          from={ui.gradientFrom}
          to={ui.gradientTo}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_CHIP[state.status]}`}>
              {statusMeta.label}
            </span>
          </div>
          <p className="truncate text-sm text-slate-400">{subtext}</p>
          {state.barFillPercent !== null && state.remainingMs !== null ? (
            <DepletingBar
              percent={state.barFillPercent}
              label={formatDuration(state.remainingMs)}
              fillClass={ui.barFill}
            />
          ) : (
            <p className="text-xs text-slate-600">No sessions logged yet</p>
          )}
        </div>
      </div>

      <button
        type="button"
        data-card-ignore
        onClick={onLog}
        className={`flex items-center justify-center gap-1.5 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${ui.logButton}`}
      >
        <Plus size={15} strokeWidth={2.5} />
        Log
      </button>
    </article>
  );
}
