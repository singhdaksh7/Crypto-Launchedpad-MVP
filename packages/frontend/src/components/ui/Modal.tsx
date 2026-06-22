import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Dialog container */}
      <div className="relative min-h-full flex items-start sm:items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="text-base font-semibold text-white">{title || 'Modal Title'}</h3>
            <button onClick={onClose} className="text-ink-400 hover:text-white transition" aria-label="Close">
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-6 text-sm text-ink-300">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-5 py-3.5 border-t border-white/5 bg-black/10 flex justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
export default Modal;
