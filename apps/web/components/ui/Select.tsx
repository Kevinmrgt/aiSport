import type { SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
}

// RGAA 4.1: select accessible avec label explicite
export function Select({
  label,
  options,
  error,
  placeholder,
  id,
  className = '',
  ...props
}: SelectProps) {
  const selectId = id ?? `select-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="field-label">
        {label}
        {props.required && (
          <>
            <span aria-hidden="true" className="text-primary-300 ml-1">*</span>
            <span className="sr-only">(requis)</span>
          </>
        )}
      </label>

      <select
        {...props}
        id={selectId}
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className={[
          'field-control',
          error ? 'border-red-400' : 'border-white/10',
          className,
        ].join(' ')}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
