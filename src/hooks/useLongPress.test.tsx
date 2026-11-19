import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useLongPress } from './useLongPress';

function Harness({ onLongPress, onClick }: { onLongPress: () => void; onClick: () => void }) {
  const handlers = useLongPress({ onLongPress, onClick });
  return (
    <div data-testid="card" tabIndex={0} {...handlers}>
      card
      <button type="button" data-testid="nested" onClick={onClick}>
        nested
      </button>
    </div>
  );
}

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onLongPress after 500ms of holding', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { getByTestId } = render(<Harness onLongPress={onLongPress} onClick={onClick} />);
    const card = getByTestId('card');

    fireEvent.pointerDown(card, { clientX: 10, clientY: 10, pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(onLongPress).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('treats a short tap as a click and suppresses the long press', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { getByTestId } = render(<Harness onLongPress={onLongPress} onClick={onClick} />);
    const card = getByTestId('card');

    fireEvent.pointerDown(card, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(card, { clientX: 10, clientY: 10, pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('cancels when the pointer scrolls more than 10px', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { getByTestId } = render(<Harness onLongPress={onLongPress} onClick={onClick} />);
    const card = getByTestId('card');

    fireEvent.pointerDown(card, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(card, { clientX: 10, clientY: 30, pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onLongPress).not.toHaveBeenCalled();
    fireEvent.pointerUp(card, { clientX: 10, clientY: 30, pointerId: 1 });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('tolerates sub-threshold jitter while holding', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { getByTestId } = render(<Harness onLongPress={onLongPress} onClick={onClick} />);
    const card = getByTestId('card');

    fireEvent.pointerDown(card, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(card, { clientX: 15, clientY: 12, pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('cancels when the pointer leaves the element', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { getByTestId } = render(<Harness onLongPress={onLongPress} onClick={onClick} />);
    const card = getByTestId('card');

    fireEvent.pointerDown(card, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerLeave(card);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('a tap on a nested interactive element does not trigger the card click', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { getByTestId } = render(<Harness onLongPress={onLongPress} onClick={onClick} />);

    fireEvent.pointerDown(getByTestId('nested'), { clientX: 5, clientY: 5, pointerId: 1 });
    fireEvent.pointerUp(getByTestId('nested'), { clientX: 5, clientY: 5, pointerId: 1 });
    expect(onClick).toHaveBeenCalledTimes(1); // the nested button's own click
    // Fired exactly once — the card gesture never hijacked it. (Native click
    // also bubbles, but the card only reacts to pointerup, which is ignored.)
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('supports keyboard activation', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { getByTestId } = render(<Harness onLongPress={onLongPress} onClick={onClick} />);
    fireEvent.keyDown(getByTestId('card'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
