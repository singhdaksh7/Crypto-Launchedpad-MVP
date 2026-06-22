import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
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
        id={id}
        className={`input-field font-sans ${error ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500' : ''}`}
        {...props}
      />
      {error && <p className="field-error mt-1 text-xs text-red-400 font-medium">{error}</p>}
      {!error && helperText && <p className="field-hint mt-1 text-xs text-ink-500">{helperText}</p>}
    </div>
  );
};
export default FormInput;
