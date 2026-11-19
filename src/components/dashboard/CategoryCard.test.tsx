import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HOUR } from '../../config/categoryConfig';
import type { CategoryState } from '../../types';
import { CategoryCard } from './CategoryCard';

const T0 = Date.now() - 2 * 24 * HOUR;

function state(overrides: Partial<CategoryState> = {}): CategoryState {
  return {
    totalScore: 210,
    level: 3,
    levelName: 'Capable',
    ringPercent: 10,
    status: 'window',
    barFillPercent: 50,
    remainingMs: 30 * HOUR,
    nextEventAt: T0 + 96 * HOUR,
    consecutiveRestViolations: 0,
    activeRestDurationMs: null,
    ...overrides,
  };
}

function renderCard(cardState: CategoryState, handlers: Partial<Record<'onLog' | 'onHelp' | 'onWhatCounts', () => void>> = {}) {
  return render(
    <CategoryCard
      category="strength"
      state={cardState}
      onLog={handlers.onLog ?? vi.fn()}
      onHelp={handlers.onHelp ?? vi.fn()}
      onWhatCounts={handlers.onWhatCounts ?? vi.fn()}
    />,
  );
}

describe('CategoryCard', () => {
  it('renders level badge, status and contextual subtext', () => {
    renderCard(state());
    expect(screen.getByText('Lvl 3 · Capable')).toBeInTheDocument();
    expect(screen.getByText('Workout Window')).toBeInTheDocument();
    expect(screen.getByText('Train now to gain')).toBeInTheDocument();
  });

  it('shows the recovery-debt note when rest violations exist', () => {
    renderCard(
      state({
        status: 'rest',
        consecutiveRestViolations: 2,
        barFillPercent: 40,
        remainingMs: 20 * HOUR,
        activeRestDurationMs: 61.2 * HOUR,
      }),
    );
    expect(screen.getByText('Rest')).toBeInTheDocument();
    expect(screen.getByText('Recovery debt extended')).toBeInTheDocument();
  });

  it('shows the next decay drop during Missed', () => {
    renderCard(state({ status: 'missed', barFillPercent: 80, remainingMs: 4 * 24 * HOUR }));
    expect(screen.getByText('Missed')).toBeInTheDocument();
    expect(screen.getByText('Next drop in 4d')).toBeInTheDocument();
  });

  it('shows the empty state before the first log', () => {
    renderCard(state({ status: 'ready', barFillPercent: null, remainingMs: null, totalScore: 140, level: 2, levelName: 'Building', ringPercent: 40 }));
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('No sessions logged yet')).toBeInTheDocument();
  });

  it('a short tap on the card body opens the log sheet', () => {
    const onLog = vi.fn();
    const { getByLabelText } = renderCard(state(), { onLog });
    const card = getByLabelText(/Tap to log a workout/i);
    fireEvent.pointerDown(card, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(card, { clientX: 10, clientY: 10, pointerId: 1 });
    expect(onLog).toHaveBeenCalledTimes(1);
  });

  it('the help button opens help without triggering the card tap', () => {
    const onLog = vi.fn();
    const onHelp = vi.fn();
    const { getByLabelText } = renderCard(state(), { onLog, onHelp });
    const help = getByLabelText('How Strength timers work');
    fireEvent.pointerDown(help, { clientX: 5, clientY: 5, pointerId: 1 });
    fireEvent.pointerUp(help, { clientX: 5, clientY: 5, pointerId: 1 });
    fireEvent.click(help);
    expect(onHelp).toHaveBeenCalledTimes(1);
    expect(onLog).not.toHaveBeenCalled();
  });
});
