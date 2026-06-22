import React from 'react';
import { Alert } from './Alert';

interface AlertBannerProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: React.ReactNode;
  children?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  variant = 'info',
  title,
  children,
  onDismiss,
  className = '',
}) => {
  return (
    <Alert
      tone={variant}
      title={title}
      onDismiss={onDismiss}
      className={className}
    >
      {children}
    </Alert>
  );
};
export default AlertBanner;
