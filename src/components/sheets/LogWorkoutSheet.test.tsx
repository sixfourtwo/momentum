import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HOUR } from '../../config/categoryConfig';
import type { FitnessProfile, WorkoutLog } from '../../types';
import { LogWorkoutSheet } from './LogWorkoutSheet';

const NOW = Date.now();

const profile: FitnessProfile = {
  id: 'default_profile',
  onboardingCompleted: true,
  assessedAt: NOW - 7 * 24 * HOUR,
  initialScores: { strength: 140, cardio: 70, mindfulness: 20 },
};

function workout(category: WorkoutLog['category'], difficulty: WorkoutLog['difficulty']): WorkoutLog {
  return {
    id: `rest-${category}`,
    category,
    timestamp: NOW - HOUR,
    durationMinutes: 45,
    difficulty,
    createdAt: NOW - HOUR,
  };
}

function renderSheet(props: { logs?: WorkoutLog[] } = {}) {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  render(
    <LogWorkoutSheet
      category="strength"
      profile={profile}
      logs={props.logs ?? []}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit, onClose };
}

describe('LogWorkoutSheet', () => {
  it('requires a duration and difficulty before submit', () => {
    renderSheet();
    const submit = screen.getByRole('button', { name: /save workout/i });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /^Moderate/ }));
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '30m' }));
    expect(submit).toBeEnabled();
  });

  it('previews a normal gain in the workout window and submits', () => {
    // Strength moderate logged 40h ago → rest (36h) ended 4h ago → in the window.
    const logs = [workout('strength', 'moderate')];
    logs[0].timestamp = NOW - 40 * HOUR;
    const { onSubmit, onClose } = renderSheet({ logs });

    fireEvent.click(screen.getByRole('button', { name: /^Moderate/ }));
    expect(screen.getByText('Rest: 1d 12h · +10% progress')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '45m' }));
    fireEvent.click(screen.getByRole('button', { name: /save workout/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0] as WorkoutLog;
    expect(submitted.category).toBe('strength');
    expect(submitted.difficulty).toBe('moderate');
    expect(submitted.durationMinutes).toBe(45);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('warns about overtraining when logging Hard during Rest', () => {
    const logs = [workout('strength', 'moderate')];
    const { onSubmit } = renderSheet({ logs });

    fireEvent.click(screen.getByRole('button', { name: /^Hard/ }));
    expect(
      screen.getByText('Still resting! -5% progress · Rest resets to 3d 18h'),
    ).toBeInTheDocument();

    // Still requires a duration.
    expect(screen.getByRole('button', { name: /save workout/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows active recovery for Light during Rest', () => {
    const logs = [workout('strength', 'moderate')];
    renderSheet({ logs });
    fireEvent.click(screen.getByRole('button', { name: /^Light/ }));
    expect(screen.getByText('Active Recovery · No penalty, rest continues')).toBeInTheDocument();
  });

  it('stays non-punitive for mindfulness during Rest', () => {
    const logs = [workout('mindfulness', 'moderate')];
    renderSheet({ logs });
    fireEvent.click(screen.getByRole('button', { name: 'Mindfulness' }));
    fireEvent.click(screen.getByRole('button', { name: /^Hard/ }));
    expect(
      screen.getByText('No penalty · Rest extends to 16h · Give the mind time to integrate'),
    ).toBeInTheDocument();
  });

  it('rejects future timestamps', () => {
    renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Earlier…' }));
    const picker = screen.getByLabelText('Workout date and time');
    const future = new Date(NOW + 2 * HOUR);
    const pad = (n: number) => String(n).padStart(2, '0');
    const value = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(future.getMinutes())}`;
    fireEvent.change(picker, { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: '30m' }));
    fireEvent.click(screen.getByRole('button', { name: /^Light/ }));
    expect(screen.getByText(/can't be logged in the future/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save workout/i })).toBeDisabled();
  });
});
