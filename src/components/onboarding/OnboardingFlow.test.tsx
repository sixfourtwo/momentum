import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FitnessProfile } from '../../types';
import { OnboardingFlow } from './OnboardingFlow';

function renderFlow() {
  const onComplete = vi.fn();
  render(<OnboardingFlow onComplete={onComplete} />);
  return { onComplete };
}

describe('OnboardingFlow', () => {
  it('walks through 3 steps and maps answers to initial scores', () => {
    const { onComplete } = renderFlow();

    // Step 1 — Strength (sum 2 → 140)
    fireEvent.click(screen.getByRole('button', { name: 'About once a week' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Comfortable with bodyweight basics or light dumbbells' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2 — Cardio (sum 5 → 380)
    fireEvent.click(screen.getByRole('button', { name: '4+ times a week' }));
    fireEvent.click(screen.getByRole('button', { name: '5 km (~30 minutes)' }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3 — Mindfulness (sum 6 → 440)
    fireEvent.click(screen.getByRole('button', { name: 'Nearly every day' }));
    fireEvent.click(screen.getByRole('button', { name: '30+ minutes comfortably' }));
    fireEvent.click(screen.getByRole('button', { name: /start training/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const saved = onComplete.mock.calls[0][0] as FitnessProfile;
    expect(saved.onboardingCompleted).toBe(true);
    expect(saved.initialScores).toEqual({ strength: 140, cardio: 380, mindfulness: 440 });
    expect(saved.answers).toEqual({
      strength_frequency: 1,
      strength_level: 1,
      cardio_frequency: 3,
      cardio_endurance: 2,
      mindfulness_frequency: 3,
      mindfulness_stillness: 3,
    });
  });

  it('blocks Continue until both questions on a step are answered', () => {
    renderFlow();
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'About once a week' }));
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Comfortable with bodyweight basics or light dumbbells' }),
    );
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
  });

  it('Skip starts every category at Foundation (20 points)', () => {
    const { onComplete } = renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /skip — start at foundation/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    const saved = onComplete.mock.calls[0][0] as FitnessProfile;
    expect(saved.initialScores).toEqual({ strength: 20, cardio: 20, mindfulness: 20 });
  });
});
