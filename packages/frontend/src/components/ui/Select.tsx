import React from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
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
      <select
        id={id}
        className={`input-field font-sans bg-surface-2 pr-10 appearance-none cursor-pointer ${
          error ? 'border-red-500/50 focus:ring-red-500/30' : ''
        }`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface-2 text-white">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="field-error mt-1 text-xs text-red-400 font-medium">{error}</p>}
      {!error && helperText && <p className="field-hint mt-1 text-xs text-ink-500">{helperText}</p>}
    </div>
  );
};
export default Select;
