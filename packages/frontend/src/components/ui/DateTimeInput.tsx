import React from 'react';

interface DateTimeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  label,
  helperText,
  error,
  className = '',
  id,
  ...props
}) => {
  return (
    <div className={`w-full ${className}`}>
      <label htmlFor={id} className="label-text mb-1.5 block text-xs uppercase tracking-wider text-ink-400 font-semibold">
        {label}
      </label>
      <input
        type="datetime-local"
        id={id}
        className="input-field font-mono"
        style={{ colorScheme: 'dark' }}
        {...props}
      />
      {error && <p className="field-error mt-1 text-xs text-red-400 font-medium">{error}</p>}
      {!error && helperText && <p className="field-hint mt-1 text-xs text-ink-500">{helperText}</p>}
    </div>
  );
};
export default DateTimeInput;
