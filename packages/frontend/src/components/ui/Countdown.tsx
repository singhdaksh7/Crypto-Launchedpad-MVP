import React, { useEffect, useState } from 'react';

interface CountdownProps {
  target: bigint;
  /** Render style: 'inline' for a single string, 'blocks' for a 4-cell display. */
  variant?: 'inline' | 'blocks';
  /** Optional text shown above the countdown when variant === 'blocks'. */
  label?: string;
  onComplete?: () => void;
}

interface Parts {
  d: number;
  h: number;
  m: number;
  s: number;
  done: boolean;
}

function compute(target: bigint): Parts {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(target) - now;
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
  return {
    d: Math.floor(diff / 86400),
    h: Math.floor((diff % 86400) / 3600),
    m: Math.floor((diff % 3600) / 60),
    s: diff % 60,
    done: false,
  };
}

export const Countdown: React.FC<CountdownProps> = ({
  target,
  variant = 'inline',
  label,
  onComplete,
}) => {
  const [parts, setParts] = useState<Parts>(() => compute(target));

  useEffect(() => {
    setParts(compute(target));
    const id = setInterval(() => {
      const next = compute(target);
      setParts(next);
      if (next.done) {
        clearInterval(id);
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target, onComplete]);

  if (parts.done) {
    return <span className="text-gray-500">Ended</span>;
  }

  if (variant === 'inline') {
    if (parts.d > 0) return <span>{parts.d}d {parts.h}h {parts.m}m</span>;
    return <span>{parts.h}h {parts.m}m {parts.s}s</span>;
  }

  const cells: { label: string; value: number }[] = [
    { label: 'Days', value: parts.d },
    { label: 'Hours', value: parts.h },
    { label: 'Minutes', value: parts.m },
    { label: 'Seconds', value: parts.s },
  ];

  return (
    <div>
      {label && <p className="text-xs text-gray-400 mb-2 text-center">{label}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {cells.map((c) => (
          <div
            key={c.label}
            className="bg-surface-3 border border-white/5 rounded-lg py-2 text-center"
          >
            <div className="text-xl sm:text-2xl font-mono font-bold tabular-nums">
              {c.value.toString().padStart(2, '0')}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
