import type { CategoryStatus, WorkoutCategory, WorkoutDifficulty } from '../types';

/* ---------------------------------- Time ---------------------------------- */

export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

/* --------------------------------- Scoring -------------------------------- */

export const MAX_SCORE = 600;
export const POINTS_PER_LEVEL = 100;
export const MISS_PENALTY = 10;

/** Progress points awarded per difficulty on a normal cycle (Ready / Window / after Missed). */
export const GAIN_POINTS: Record<WorkoutDifficulty, number> = {
  light: 6,
  moderate: 10,
  hard: 13,
};

export const LEVELS = [
  { name: 'Foundation', description: 'Establishing the basic habit and baseline movement/awareness.' },
  { name: 'Building', description: 'Developing consistent weekly rhythm and work tolerance.' },
  { name: 'Capable', description: 'Solid general fitness; comfortably handles regular training load.' },
  { name: 'Resilient', description: 'High consistency and recovery capacity across tough sessions.' },
  { name: 'Advanced', description: 'Well-trained conditioning requiring disciplined recovery and stimulus.' },
  { name: 'Peak', description: 'Elite consistency; fills to 100% (600) and caps as peak conditioning.' },
] as const;

export function levelForScore(score: number): number {
  return Math.min(6, Math.floor(score / POINTS_PER_LEVEL) + 1);
}

export function levelNameForScore(score: number): string {
  return LEVELS[levelForScore(score) - 1].name;
}

export function ringPercentForScore(score: number): number {
  return score >= MAX_SCORE ? 100 : score % POINTS_PER_LEVEL;
}

/* ----------------------------- Timing matrix ------------------------------ */

export interface DifficultyTimers {
  /** "Earliest to train again" */
  rest: number;
  /** "Train to gain" — window duration, measured from the end of Rest. */
  window: number;
}

export interface CategoryTiming {
  timers: Record<WorkoutDifficulty, DifficultyTimers>;
  /** Recurring decay interval once the Workout Window is missed. */
  decayInterval: number;
}

/**
 * Science-based timing matrix (spec §5).
 * Note: rest + window equals the "max gap before maintenance" column for every row.
 */
export const TIMING_MATRIX: Record<WorkoutCategory, CategoryTiming> = {
  strength: {
    timers: {
      light: { rest: 24 * HOUR, window: 48 * HOUR },
      moderate: { rest: 36 * HOUR, window: 60 * HOUR },
      hard: { rest: 60 * HOUR, window: 60 * HOUR },
    },
    decayInterval: 5 * DAY,
  },
  cardio: {
    timers: {
      light: { rest: 12 * HOUR, window: 36 * HOUR },
      moderate: { rest: 24 * HOUR, window: 48 * HOUR },
      hard: { rest: 48 * HOUR, window: 48 * HOUR },
    },
    decayInterval: 3 * DAY,
  },
  mindfulness: {
    timers: {
      light: { rest: 4 * HOUR, window: 32 * HOUR },
      moderate: { rest: 8 * HOUR, window: 40 * HOUR },
      hard: { rest: 16 * HOUR, window: 44 * HOUR },
    },
    decayInterval: 3 * DAY,
  },
};

/* --------------------- Overtraining (violation) rules --------------------- */

/**
 * Score penalty for logging a Moderate/Hard workout during Rest (Strength & Cardio only).
 * Light is active recovery → 0. Mindfulness never incurs penalties.
 */
export function violationPenalty(difficulty: 'moderate' | 'hard', violationNumber: number): number {
  if (difficulty === 'moderate') {
    return violationNumber === 1 ? 0 : -5;
  }
  if (violationNumber === 1) return -5;
  if (violationNumber === 2) return -10;
  return -15;
}

/**
 * Rest multiplier applied to the violating workout's base rest.
 * Moderate: 1st ×1.25, then 1 + 0.35·v capped at 2.25.
 * Hard: 1st ×1.5, then 1 + 0.5·v capped at 2.5.
 */
export function violationRestMultiplier(difficulty: 'moderate' | 'hard', violationNumber: number): number {
  if (difficulty === 'moderate') {
    return violationNumber === 1 ? 1.25 : Math.min(1 + 0.35 * violationNumber, 2.25);
  }
  return violationNumber === 1 ? 1.5 : Math.min(1 + 0.5 * violationNumber, 2.5);
}

/* ------------------------------ Onboarding -------------------------------- */

/** Maps a per-category questionnaire sum (0–6) to the starting totalScore. */
export const ONBOARDING_SCORE_MAP = [20, 70, 140, 220, 310, 380, 440] as const;

export function scoreFromCategorySum(sum: number): number {
  const clamped = Math.max(0, Math.min(6, Math.round(sum)));
  return ONBOARDING_SCORE_MAP[clamped];
}

export interface OnboardingOption {
  points: 0 | 1 | 2 | 3;
  label: string;
}

export interface OnboardingQuestion {
  id: string;
  category: WorkoutCategory;
  prompt: string;
  options: OnboardingOption[];
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'strength_frequency',
    category: 'strength',
    prompt: 'How often do you currently do strength or resistance training?',
    options: [
      { points: 0, label: 'Rarely or never' },
      { points: 1, label: 'About once a week' },
      { points: 2, label: '2 times a week' },
      { points: 3, label: '3+ times a week' },
    ],
  },
  {
    id: 'strength_level',
    category: 'strength',
    prompt: 'Which best describes your current strength level?',
    options: [
      { points: 0, label: 'Bodyweight basics (squats, pushups) feel very challenging' },
      { points: 1, label: 'Comfortable with bodyweight basics or light dumbbells' },
      { points: 2, label: 'Regularly lift moderate weights or perform solid calisthenics' },
      { points: 3, label: 'Train heavy with structured progressive overload' },
    ],
  },
  {
    id: 'cardio_frequency',
    category: 'cardio',
    prompt: 'How often do you currently do sustained cardio (running, cycling, swimming, brisk incline walking)?',
    options: [
      { points: 0, label: 'Rarely or never' },
      { points: 1, label: 'About once a week' },
      { points: 2, label: '2–3 times a week' },
      { points: 3, label: '4+ times a week' },
    ],
  },
  {
    id: 'cardio_endurance',
    category: 'cardio',
    prompt: 'How far could you run/jog (or sustain vigorous cardio) right now without stopping?',
    options: [
      { points: 0, label: 'Under 1 km (less than 5 minutes)' },
      { points: 1, label: '2–3 km (~15 minutes)' },
      { points: 2, label: '5 km (~30 minutes)' },
      { points: 3, label: '10 km+ (60+ minutes)' },
    ],
  },
  {
    id: 'mindfulness_frequency',
    category: 'mindfulness',
    prompt: 'How often do you currently practice intentional mindfulness, breathwork, or meditation?',
    options: [
      { points: 0, label: 'Rarely or never' },
      { points: 1, label: '1–2 times a week' },
      { points: 2, label: '3–4 times a week' },
      { points: 3, label: 'Nearly every day' },
    ],
  },
  {
    id: 'mindfulness_stillness',
    category: 'mindfulness',
    prompt: 'How long can you comfortably hold focused stillness or breath awareness?',
    options: [
      { points: 0, label: 'Under 2 minutes before getting restless' },
      { points: 1, label: '5–10 minutes' },
      { points: 2, label: '15–20 minutes' },
      { points: 3, label: '30+ minutes comfortably' },
    ],
  },
];

/* ------------------------------- UI copy ---------------------------------- */

export interface CategoryCopy {
  qualifies: string;
  doesntCount: string;
  examples: Record<WorkoutDifficulty, string>;
  science: {
    rest: string;
    window: string;
    maintenance: string;
    overtraining: string;
  };
}

export type CategoryMeta = {
  label: string;
  /** lucide-react icon name, mapped to a component in the UI layer. */
  icon: 'dumbbell' | 'heart-pulse' | 'brain';
  copy: CategoryCopy;
};

export const CATEGORY_META: Record<WorkoutCategory, CategoryMeta> = {
  strength: {
    label: 'Strength',
    icon: 'dumbbell',
    copy: {
      qualifies:
        'Any intentional resistance work challenging your muscles against external load or bodyweight — free weights, machines, kettlebells, resistance bands, calisthenics, bouldering/climbing, heavy functional carries.',
      doesntCount: 'Casual walking, light stretching, or carrying groceries.',
      examples: {
        light: '15–20 min bodyweight mobility-strength circuit, light band work, leaving 4+ reps in reserve.',
        moderate: 'Standard 30–45 min gym or home lifting session, challenging sets stopping 2–3 reps shy of failure.',
        hard: 'Heavy compound lifting, pushing sets near or to muscular failure, high-volume leg day, or an intense bouldering session leaving muscles noticeably fatigued.',
      },
      science: {
        rest: 'Muscle protein synthesis peaks around 24h after training and largely returns to baseline by ~36h. Neural and tissue fatigue clear in ~24h after light work, ~36h after moderate work, and up to ~60h after heavy, high-effort sessions.',
        window: 'Strength adapts best with 2+ sessions per week. Inside this window you are still supercompensating — train again and gains keep stacking.',
        maintenance:
          'Training once per week acts mainly as maintenance, and strength resists detraining for 2–4 weeks — so decay is slower than cardio: −10 points every 5 days once the window is missed.',
        overtraining:
          'Light sessions during Rest count as active recovery — safe movement, no penalty. Logging Moderate or Hard before recovery completes compounds fatigue: expect stalled or negative progress and an extended rest timer.',
      },
    },
  },
  cardio: {
    label: 'Cardio',
    icon: 'heart-pulse',
    copy: {
      qualifies:
        'Sustained rhythmic activity that elevates your heart rate and breathing for at least 15–20 continuous minutes (or shorter high-intensity intervals) — running, cycling, swimming, rowing, brisk incline walking, hiking, jump rope, team sports.',
      doesntCount: 'Casual errands, slow strolling without elevated heart rate, or 3 minutes of walking to the bus.',
      examples: {
        light: 'Easy conversational Zone 2 jog, brisk walk, casual bike ride — you could speak in full sentences.',
        moderate: 'Steady 30–45 min run, tempo ride, vigorous swim, or active sport where speaking takes effort.',
        hard: 'HIIT / VO2 max intervals (e.g. 4×4 min hard efforts), hill sprints, race-pace 5K/10K, or a grueling endurance push where you can only speak a few words.',
      },
      science: {
        rest: 'Easy aerobic (Zone 2) work creates minimal structural disruption and can repeat within 12–24h, while high-intensity VO2 max intervals need 1–2 recovery days (24–48h) before going hard again.',
        window: 'Plasma volume adapts within ~48h and mitochondrial enzymes respond quickly, but building VO2 max and endurance takes 2–3+ quality sessions per week. Train inside this window to keep building.',
        maintenance:
          'Aerobic capacity fades faster than strength — mitochondrial enzymes decline within days without stimulus. After the window is missed, expect −10 points every 3 days.',
        overtraining:
          'Light sessions during Rest act as active recovery. Stacking Moderate or Hard work before recovery completes blunts adaptation — stalled or negative progress and a longer rest timer.',
      },
    },
  },
  mindfulness: {
    label: 'Mindfulness',
    icon: 'brain',
    copy: {
      qualifies:
        'Intentional, distraction-free mental training focused on awareness, breath, stillness, or deliberate cognitive presence — breath-focused meditation, body scan, structured breathwork, walking meditation without phone or podcasts, mindful yoga/tai chi, deliberate silent journaling/reflection.',
      doesntCount: 'Zoning out while scrolling, listening to a podcast on a walk, or passively taking a nap.',
      examples: {
        light: '5–10 min guided meditation, box breathing to down-regulate stress, or a brief body scan.',
        moderate: '15–25 min unguided or guided focused meditation, structured breathwork, or dedicated mindful yoga.',
        hard: '30+ min deep silent meditation, intense breathwork, or sustained emotional/focus practice requiring high mental discipline.',
      },
      science: {
        rest: 'Mindfulness involves no muscular micro-tears, so same-day sessions are physiologically safe. Rest here is an integration buffer — brief spacing helps consolidate attention gains.',
        window: 'Clinical and fMRI research ties the benefits to high frequency (4–7 days/week). Train again inside this window to compound attention and stress-reduction gains.',
        maintenance:
          'Attention efficiency and stress benefits fade without regular practice. After the window is missed, expect −10 points every 3 days.',
        overtraining:
          'Mindfulness never triggers overtraining penalties. Logging during Rest simply earns no extra points (so levels cannot be gamed with back-to-back sessions), and the rest timer only extends if the new session\u2019s base rest is longer. Back-to-back Hard sessions deserve a gentle reminder to allow mental integration time.',
      },
    },
  },
};

export const CATEGORIES: WorkoutCategory[] = ['strength', 'cardio', 'mindfulness'];

export const STATUS_META: Record<CategoryStatus, { label: string; subtext: string }> = {
  ready: { label: 'Ready', subtext: 'Ready when you are' },
  rest: { label: 'Rest', subtext: 'Recovering — hold off' },
  window: { label: 'Workout Window', subtext: 'Train now to gain' },
  missed: { label: 'Missed', subtext: 'Next drop in' },
};

export const DIFFICULTY_META: Record<WorkoutDifficulty, { label: string; dot: string }> = {
  light: { label: 'Light', dot: 'bg-emerald-400' },
  moderate: { label: 'Moderate', dot: 'bg-amber-400' },
  hard: { label: 'Hard', dot: 'bg-rose-400' },
};

export const DURATION_CHIPS = [10, 20, 30, 45, 60];
