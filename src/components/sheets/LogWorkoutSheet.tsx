import { useMemo, useState } from 'react';
import type { FitnessProfile, WorkoutCategory, WorkoutDifficulty, WorkoutLog } from '../../types';
import {
  CATEGORY_META,
  CATEGORIES,
  DURATION_CHIPS,
  DIFFICULTY_META,
} from '../../config/categoryConfig';
import { CATEGORY_UI } from '../../config/categoryUi';
import { simulateLog } from '../../domain/simulateLog';
import { BottomSheet } from './BottomSheet';

const TONE_STYLES = {
  positive: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  neutral: 'border-slate-700 bg-slate-800/60 text-slate-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  danger: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
} as const;

interface LogWorkoutSheetProps {
  category: WorkoutCategory;
  profile: FitnessProfile;
  logs: WorkoutLog[];
  onClose: () => void;
  onSubmit: (log: WorkoutLog) => void;
}

const DIFFICULTIES: WorkoutDifficulty[] = ['light', 'moderate', 'hard'];

function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/**
 * Under-5-second workout entry (spec §6): when, how long, how it felt — with
 * a live engine-derived preview of the outcome, including overtraining warnings.
 */
export function LogWorkoutSheet({ category: initialCategory, profile, logs, onClose, onSubmit }: LogWorkoutSheetProps) {
  const [category, setCategory] = useState(initialCategory);
  const [whenMode, setWhenMode] = useState<'now' | 'custom'>('now');
  const [whenValue, setWhenValue] = useState(() => toDateTimeLocalValue(new Date(Date.now() - 3_600_000)));
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState('');
  const [difficulty, setDifficulty] = useState<WorkoutDifficulty | null>(null);

  const now = Date.now();
  const timestamp = whenMode === 'now' ? now : new Date(whenValue).getTime();
  const customParsed = customDuration.trim() === '' ? null : Number.parseInt(customDuration, 10);
  const effectiveDuration = customParsed ?? durationMinutes;
  const futureDated = Number.isFinite(timestamp) && timestamp > now;
  const canSubmit =
    effectiveDuration !== null &&
    Number.isFinite(effectiveDuration) &&
    effectiveDuration > 0 &&
    difficulty !== null &&
    Number.isFinite(timestamp) &&
    !futureDated;

  const previewable = difficulty !== null && Number.isFinite(timestamp) && !futureDated;
  const preview = useMemo(() => {
    if (!previewable || difficulty === null) return null;
    return simulateLog(profile.initialScores[category], logs, {
      category,
      difficulty,
      timestamp,
      durationMinutes: effectiveDuration ?? 0,
    });
  }, [category, difficulty, timestamp, previewable, profile, logs]);

  const handleSubmit = () => {
    if (!canSubmit || difficulty === null || effectiveDuration === null) return;
    onSubmit({
      id: crypto.randomUUID(),
      category,
      timestamp: whenMode === 'now' ? Date.now() : timestamp,
      durationMinutes: effectiveDuration,
      difficulty,
      createdAt: Date.now(),
    });
    onClose();
  };

  const meta = CATEGORY_META[category];

  return (
    <BottomSheet title="Log workout" subtitle="When · how long · how it felt" onClose={onClose}>
      <div className="flex flex-col gap-5">
        {/* Category */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-800 p-1">
            {CATEGORIES.map((option) => {
              const optionUi = CATEGORY_UI[option];
              const active = category === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategory(option)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[13px] font-medium transition ${
                    active ? optionUi.segmentedOn : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <optionUi.Icon size={14} />
                  {CATEGORY_META[option].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* When */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">When</p>
          <div className="flex gap-2">
            {(['now', 'custom'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setWhenMode(mode)}
                className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
                  whenMode === mode
                    ? 'border-slate-400 bg-slate-800 text-slate-100'
                    : 'border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'now' ? 'Now' : 'Earlier…'}
              </button>
            ))}
          </div>
          {whenMode === 'custom' && (
            <input
              type="datetime-local"
              aria-label="Workout date and time"
              value={whenValue}
              max={toDateTimeLocalValue(new Date())}
              onChange={(event) => setWhenValue(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
            />
          )}
          {futureDated && (
            <p className="mt-1.5 text-xs text-rose-400">Workouts can't be logged in the future.</p>
          )}
        </div>

        {/* Duration */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Duration</p>
          <div className="flex flex-wrap gap-2">
            {DURATION_CHIPS.map((minutes) => {
              const active = customDuration.trim() === '' && durationMinutes === minutes;
              return (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => {
                    setDurationMinutes(minutes);
                    setCustomDuration('');
                  }}
                  className={`rounded-xl border px-3.5 py-1.5 text-sm font-medium tabular-nums transition ${
                    active
                      ? 'border-slate-400 bg-slate-800 text-slate-100'
                      : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {minutes}m
                </button>
              );
            })}
            <input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="Custom"
              value={customDuration}
              onChange={(event) => setCustomDuration(event.target.value)}
              className="w-24 rounded-xl border border-slate-800 bg-slate-800/60 px-3 py-1.5 text-sm tabular-nums text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-600"
            />
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            How it felt
          </p>
          <div className="flex flex-col gap-2">
            {DIFFICULTIES.map((option) => {
              const active = difficulty === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDifficulty(option)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? 'border-slate-400 bg-slate-800/80'
                      : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DIFFICULTY_META[option].dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-100">
                      {DIFFICULTY_META[option].label}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {meta.copy.examples[option]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Outcome preview */}
        {preview !== null && (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${TONE_STYLES[preview.tone]}`}>
            {preview.message}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full rounded-2xl py-3 text-sm font-semibold transition ${
            canSubmit
              ? 'bg-slate-100 text-slate-950 hover:bg-white active:scale-[0.99]'
              : 'cursor-not-allowed bg-slate-800 text-slate-500'
          }`}
        >
          Save workout
        </button>
      </div>
    </BottomSheet>
  );
}
