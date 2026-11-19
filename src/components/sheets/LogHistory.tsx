import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { WorkoutLog } from '../../types';
import { DIFFICULTY_META } from '../../config/categoryConfig';

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

interface LogHistoryProps {
  logs: WorkoutLog[];
  onDeleteLog: (id: string) => void;
}

/**
 * Recent sessions with a two-tap delete so accidental entries can be removed
 * and the deterministic engine recalculates immediately (US-5.2).
 */
export function LogHistory({ logs, onDeleteLog }: LogHistoryProps) {
  const recent = [...logs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

  if (recent.length === 0) {
    return <p className="text-sm text-slate-500">No sessions logged yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {recent.map((log) => (
        <LogRow key={log.id} log={log} onDeleteLog={onDeleteLog} />
      ))}
    </ul>
  );
}

function LogRow({ log, onDeleteLog }: { log: WorkoutLog; onDeleteLog: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  return (
    <li className="flex items-center gap-3 rounded-xl bg-slate-800/50 px-3 py-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${DIFFICULTY_META[log.difficulty].dot}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-200">
          {DIFFICULTY_META[log.difficulty].label} · {log.durationMinutes} min
        </p>
        <p className="text-xs text-slate-500">{DATE_FORMAT.format(new Date(log.timestamp))}</p>
      </div>
      <button
        type="button"
        onClick={() => (confirming ? onDeleteLog(log.id) : setConfirming(true))}
        aria-label={confirming ? `Confirm delete` : `Delete session`}
        className={`shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
          confirming
            ? 'bg-rose-500/20 text-rose-300'
            : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
        }`}
      >
        {confirming ? 'Delete?' : <Trash2 size={15} />}
      </button>
    </li>
  );
}
