import React, { useState } from 'react';
import { Icon } from './Icon';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, label, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-xs ${className}`}
      aria-label={`Copy ${label || 'text'}`}
    >
      <Icon name={copied ? 'check' : 'copy'} size={14} />
      {label && <span>{copied ? 'Copied' : label}</span>}
    </button>
  );
};
