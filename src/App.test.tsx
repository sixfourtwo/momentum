import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

/**
 * End-to-end regression for the reported bug: logging a workout must update
 * the dashboard immediately — without a manual page reload — and the entry
 * must survive an app restart (fresh mount over the same storage).
 */
describe('App end-to-end', () => {
  beforeEach(() => {
    // Fresh IndexedDB + localStorage per test.
    (globalThis as { indexedDB: unknown }).indexedDB = new IDBFactory();
    localStorage.clear();
  });

  it('updates the dashboard immediately after logging a workout', async () => {
    render(<App />);

    // First run: onboarding gate → skip to Foundation.
    fireEvent.click(await screen.findByRole('button', { name: /skip — start at foundation/i }));

    // Dashboard shows three Foundation cards.
    expect((await screen.findAllByText('Lvl 1 · Foundation')).length).toBe(3);

    // Short-tap the Strength card body → Log sheet.
    const strengthCard = screen.getByLabelText(/Strength: level 1 Foundation/);
    fireEvent.pointerDown(strengthCard, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(strengthCard, { clientX: 10, clientY: 10, pointerId: 1 });
    await screen.findByText('Log workout');

    // Light · 20m · Now → save.
    fireEvent.click(screen.getByRole('button', { name: /^Light/ }));
    fireEvent.click(screen.getByRole('button', { name: '20m' }));
    fireEvent.click(screen.getByRole('button', { name: /save workout/i }));

    // THE REGRESSION: the Strength card enters Rest immediately — no reload.
    await screen.findByText('Recovering — hold off');
    expect(screen.queryByText('Log workout')).not.toBeInTheDocument();
    expect((await screen.findAllByText('Ready')).length).toBe(2);

    // Simulated restart: a fresh mount over the same storage sees the log.
    cleanup();
    render(<App />);
    await screen.findByText('Recovering — hold off', {}, { timeout: 5000 });
    expect((await screen.findAllByText('Ready')).length).toBe(2);
  });

  it('skipping onboarding lands on a ready dashboard', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /skip — start at foundation/i }));
    expect(await screen.findByText('Momentum')).toBeInTheDocument();
    expect((await screen.findAllByText('Ready')).length).toBe(3);
    expect(screen.getAllByText('No sessions logged yet').length).toBe(3);
  });
});
