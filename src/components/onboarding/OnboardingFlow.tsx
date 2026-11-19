import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { FitnessProfile, WorkoutCategory } from '../../types';
import {
  CATEGORY_META,
  CATEGORIES,
  ONBOARDING_QUESTIONS,
  scoreFromCategorySum,
} from '../../config/categoryConfig';
import { CATEGORY_UI } from '../../config/categoryUi';

interface OnboardingFlowProps {
  onComplete: (profile: FitnessProfile) => void;
}

/**
 * Perceived-fitness questionnaire (spec §4): 3 steps × 2 questions, scored
 * 0–3 each, mapped to starting levels capped at Level 5. "Skip" starts
 * everything at Foundation.
 */
export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const category: WorkoutCategory = CATEGORIES[step];
  const questions = ONBOARDING_QUESTIONS.filter((question) => question.category === category);
  const stepComplete = questions.every((question) => answers[question.id] !== undefined);
  const isLastStep = step === CATEGORIES.length - 1;
  const ui = CATEGORY_UI[category];
  const meta = CATEGORY_META[category];

  const buildProfile = (finalAnswers: Record<string, number>): FitnessProfile => {
    const initialScores: Record<WorkoutCategory, number> = {
      strength: 0,
      cardio: 0,
      mindfulness: 0,
    };
    for (const option of CATEGORIES) {
      const sum = ONBOARDING_QUESTIONS.filter((question) => question.category === option).reduce(
        (total, question) => total + (finalAnswers[question.id] ?? 0),
        0,
      );
      initialScores[option] = scoreFromCategorySum(sum);
    }
    return {
      id: 'default_profile',
      onboardingCompleted: true,
      assessedAt: Date.now(),
      initialScores,
      answers: finalAnswers,
    };
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <header className="pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Welcome to Momentum</h1>
        <p className="mt-1 text-sm text-slate-400">
          Six quick questions so you start at your real level — about 30 seconds.
        </p>
      </header>

      <div className="flex items-center gap-1.5 py-4" aria-hidden="true">
        {CATEGORIES.map((option, index) => (
          <span
            key={option}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index <= step ? CATEGORY_UI[option].accentText.replace('text-', 'bg-') : 'bg-slate-800'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2.5 pb-4">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${ui.chip}`}>
          <ui.Icon size={18} strokeWidth={2.2} />
        </span>
        <div>
          <p className="text-xs text-slate-500">
            Step {step + 1} of {CATEGORIES.length}
          </p>
          <h2 className="text-base font-semibold text-slate-100">{meta.label}</h2>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5">
        {questions.map((question) => (
          <fieldset key={question.id}>
            <legend className="mb-2 text-sm font-medium leading-snug text-slate-200">
              {question.prompt}
            </legend>
            <div className="flex flex-col gap-2">
              {question.options.map((option) => {
                const selected = answers[question.id] === option.points;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.points }))}
                    className={`rounded-2xl border px-4 py-2.5 text-left text-sm transition ${
                      selected
                        ? ui.selectedOption + ' text-slate-100'
                        : 'border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-5">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((current) => current - 1)}
            className="rounded-2xl border border-slate-800 p-3 text-slate-400 transition hover:text-slate-200"
            aria-label="Previous step"
          >
            <ArrowLeft size={16} />
          </button>
        ) : null}
        <button
          type="button"
          disabled={!stepComplete}
          onClick={() => (isLastStep ? onComplete(buildProfile(answers)) : setStep((current) => current + 1))}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition ${
            stepComplete
              ? 'bg-slate-100 text-slate-950 hover:bg-white active:scale-[0.99]'
              : 'cursor-not-allowed bg-slate-800 text-slate-500'
          }`}
        >
          {isLastStep ? 'Start training' : 'Continue'}
          <ArrowRight size={15} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onComplete(buildProfile({}))}
        className="mt-3 text-center text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-slate-300 hover:underline"
      >
        Skip — Start at Foundation
      </button>
    </div>
  );
}
