import { useCallback, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

function triggerHaptic(): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  } catch {
    // Haptics unsupported — silently ignore.
  }
}

export interface LongPressHandlers {
  onPointerDown: (event: ReactPointerEvent) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onKeyDown: (event: ReactKeyboardEvent) => void;
  onContextMenu: (event: { preventDefault: () => void }) => void;
}

export interface UseLongPressOptions {
  onLongPress?: () => void;
  onClick?: () => void;
  /** Hold duration before the long press fires. */
  ms?: number;
  /** Movement (px) that cancels a pending press so scrolling never triggers it. */
  moveThresholdPx?: number;
  /** Elements matching this selector never start the gesture (nested buttons). */
  ignoreSelector?: string;
}

/**
 * Press-and-hold gesture (spec §6): fires `onLongPress` after `ms`, falls back
 * to `onClick` on a short tap, cancels on scroll (>threshold movement) and
 * never triggers the browser's native context menu / text selection.
 */
export function useLongPress({
  onLongPress,
  onClick,
  ms = 500,
  moveThresholdPx = 10,
  ignoreSelector,
}: UseLongPressOptions): LongPressHandlers {
  const timerRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const cancelledRef = useRef(false);
  const startPointRef = useRef({ x: 0, y: 0 });
  const callbacksRef = useRef({ onLongPress, onClick });
  callbacksRef.current = { onLongPress, onClick };

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    cancelledRef.current = true;
  }, [clearTimer]);

  const shouldIgnore = useCallback(
    (target: EventTarget | null): boolean =>
      ignoreSelector !== undefined &&
      target instanceof Element &&
      target.closest(ignoreSelector) !== null,
    [ignoreSelector],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (shouldIgnore(event.target)) return;
      clearTimer();
      firedRef.current = false;
      cancelledRef.current = false;
      startPointRef.current = { x: event.clientX, y: event.clientY };
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        firedRef.current = true;
        triggerHaptic();
        callbacksRef.current.onLongPress?.();
      }, ms);
    },
    [clearTimer, ms, shouldIgnore],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      if (timerRef.current === null) return;
      const dx = event.clientX - startPointRef.current.x;
      const dy = event.clientY - startPointRef.current.y;
      if (Math.hypot(dx, dy) > moveThresholdPx) {
        cancel();
      }
    },
    [cancel, moveThresholdPx],
  );

  const onPointerUp = useCallback(() => {
    const wasFired = firedRef.current;
    const wasCancelled = cancelledRef.current;
    clearTimer();
    if (!wasFired && !wasCancelled) {
      callbacksRef.current.onClick?.();
    }
  }, [clearTimer]);

  const onKeyDown = useCallback((event: ReactKeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callbacksRef.current.onClick?.();
    }
  }, []);

  const onContextMenu = useCallback((event: { preventDefault: () => void }) => {
    event.preventDefault();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onKeyDown,
    onContextMenu,
  };
}
