import type { SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  placeholder?: string;
}

// RGAA 4.1: select accessible avec label explicite
export function Select({
  label,
  options,
  error,
  hint,
  placeholder,
  id,
  className = '',
  ...props
}: SelectProps) {
  const selectId = id ?? `select-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = error ? `${selectId}-error` : undefined;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="field-label">
        {label}
        {props.required && (
          <>
            <span aria-hidden="true" className="ml-1 text-primary-300">*</span>
            <span className="sr-only">(requis)</span>
          </>
        )}
      </label>

      {hint && (
        <p id={hintId} className="text-xs text-zinc-400">
          {hint}
        </p>
      )}

      <select
        {...props}
        id={selectId}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={[
          'field-control',
          error ? 'border-sport-orange' : 'border-white/10',
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
        <p id={errorId} role="alert" className="text-xs text-sport-orange">
          {error}
        </p>
      )}
    </div>
  );
}
