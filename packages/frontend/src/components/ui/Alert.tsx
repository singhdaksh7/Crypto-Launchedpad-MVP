import React from 'react';
import { Icon } from './Icon';

type AlertTone = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  tone?: AlertTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const TONES: Record<AlertTone, { wrap: string; icon: 'info' | 'check-circle' | 'alert' }> = {
  info: {
    wrap: 'bg-sky-500/10 border-sky-500/30 text-sky-100',
    icon: 'info',
  },
  success: {
    wrap: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100',
    icon: 'check-circle',
  },
  warning: {
    wrap: 'bg-amber-500/10 border-amber-500/30 text-amber-100',
    icon: 'alert',
  },
  error: {
    wrap: 'bg-red-500/10 border-red-500/30 text-red-100',
    icon: 'alert',
  },
};

export const Alert: React.FC<AlertProps> = ({
  tone = 'info',
  title,
  children,
  onDismiss,
  className = '',
}) => {
  const t = TONES[tone];
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm animate-fade-in ${t.wrap} ${className}`}
    >
      <Icon name={t.icon} size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium leading-snug">{title}</p>}
        {children && (
          <div className={title ? 'text-sm opacity-90 mt-0.5' : ''}>{children}</div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="opacity-60 hover:opacity-100 shrink-0"
          aria-label="Dismiss"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
};
