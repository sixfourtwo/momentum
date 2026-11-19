interface DepletingBarProps {
  /** 0–100 remaining fill. */
  percent: number;
  /** Formatted countdown shown beside the bar, or null to hide it. */
  label: string | null;
  /** Tailwind classes for the fill. */
  fillClass: string;
}

/** Horizontal bar that starts 100% full and depletes left-to-right. */
export function DepletingBar({ percent, label, fillClass }: DepletingBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${fillClass}`}
          style={{ width: `${clamped}%`, transition: 'width 900ms linear' }}
        />
      </div>
      {label !== null && (
        <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums text-slate-300">
          {label}
        </span>
      )}
    </div>
  );
}
