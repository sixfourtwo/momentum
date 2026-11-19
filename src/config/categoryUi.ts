import { Brain, Dumbbell, HeartPulse, type LucideIcon } from 'lucide-react';
import type { WorkoutCategory } from '../types';

/** UI presentation layer for categories: icons + Tailwind accent classes. */
export interface CategoryUi {
  Icon: LucideIcon;
  /** Hex values for the SVG ring gradient. */
  gradientFrom: string;
  gradientTo: string;
  chip: string;
  accentText: string;
  segmentedOn: string;
  barFill: string;
  logButton: string;
  selectedOption: string;
}

export const CATEGORY_UI: Record<WorkoutCategory, CategoryUi> = {
  strength: {
    Icon: Dumbbell,
    gradientFrom: '#fb7185',
    gradientTo: '#fbbf24',
    chip: 'bg-strength/15 text-strength',
    accentText: 'text-strength',
    segmentedOn: 'bg-slate-950 text-strength shadow',
    barFill: 'bg-gradient-to-r from-strength-from to-strength-to',
    logButton: 'border-strength/40 text-strength hover:bg-strength/10 active:bg-strength/20',
    selectedOption: 'border-strength bg-strength/10',
  },
  cardio: {
    Icon: HeartPulse,
    gradientFrom: '#2dd4bf',
    gradientTo: '#38bdf8',
    chip: 'bg-cardio/15 text-cardio',
    accentText: 'text-cardio',
    segmentedOn: 'bg-slate-950 text-cardio shadow',
    barFill: 'bg-gradient-to-r from-cardio-from to-cardio-to',
    logButton: 'border-cardio/40 text-cardio hover:bg-cardio/10 active:bg-cardio/20',
    selectedOption: 'border-cardio bg-cardio/10',
  },
  mindfulness: {
    Icon: Brain,
    gradientFrom: '#818cf8',
    gradientTo: '#c084fc',
    chip: 'bg-mindfulness/15 text-mindfulness',
    accentText: 'text-mindfulness',
    segmentedOn: 'bg-slate-950 text-mindfulness shadow',
    barFill: 'bg-gradient-to-r from-mindfulness-from to-mindfulness-to',
    logButton: 'border-mindfulness/40 text-mindfulness hover:bg-mindfulness/10 active:bg-mindfulness/20',
    selectedOption: 'border-mindfulness bg-mindfulness/10',
  },
};
