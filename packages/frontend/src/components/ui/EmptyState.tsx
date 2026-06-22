import React from 'react';
import { Icon } from './Icon';

interface EmptyStateProps {
  icon?: 'rocket' | 'wallet' | 'gauge' | 'shield' | 'lock' | 'plus' | 'spinner' | 'check' | 'alert' | 'image' | 'menu' | 'close' | 'copy' | 'external' | 'arrow-right' | 'arrow-down';
  title: string;
  body: string;
  CTA?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'rocket',
  title,
  body,
  CTA,
}) => {
  return (
    <div className="card text-center py-14 flex flex-col items-center justify-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-ink-400 mb-4 shadow-soft">
        <Icon name={icon} size={20} />
      </div>
      <h3 className="text-base font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-sm text-ink-400 max-w-sm mx-auto mb-6 leading-relaxed">
        {body}
      </p>
      {CTA && <div className="flex justify-center">{CTA}</div>}
    </div>
  );
};
export default EmptyState;
