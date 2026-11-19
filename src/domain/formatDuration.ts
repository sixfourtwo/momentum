import { HOUR } from '../config/categoryConfig';

/**
 * Formats a duration as days and hours only, rounded up to the nearest whole
 * hour so "0h" never appears while time remains.
 *
 * - 24h or more: "2d 14h" (or "2d" when hours equal 0)
 * - under 24h:   "16h" (or "under 1h" when fewer than 60 minutes remain)
 * - zero/negative: "0h"
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0h';
  if (ms < HOUR) return 'under 1h';
  const totalHours = Math.ceil(ms / HOUR);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days === 0) return `${hours}h`;
  return hours === 0 ? `${days}d` : `${days}d ${hours}h`;
}
