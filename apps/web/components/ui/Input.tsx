import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

// RGAA 4.1: champ de formulaire accessible
// - Label explicite obligatoire (pas de placeholder seul)
// - Association label ↔ input via htmlFor/id
// - Message d'erreur lié via aria-describedby
export function Input({ label, error, hint, id, className = '', ...props }: InputProps) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {/* RGAA 4.1: label explicite toujours visible */}
      <label htmlFor={inputId} className="text-sm font-medium text-zinc-700">
        {label}
        {props.required && (
          <span aria-hidden="true" className="text-red-500 ml-1">*</span>
        )}
        {props.required && <span className="sr-only">(requis)</span>}
      </label>

      {hint && (
        <p id={hintId} className="text-xs text-zinc-400">
          {hint}
        </p>
      )}

      <input
        {...props}
        id={inputId}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={[
          'rounded-md border px-3 py-2 text-sm transition-colors bg-white',
          'focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900',
          error
            ? 'border-red-400 text-zinc-900 placeholder-zinc-400'
            : 'border-zinc-300 text-zinc-900 placeholder-zinc-400',
          className,
        ].join(' ')}
      />

      {/* RGAA 4.1: message d'erreur lié au champ */}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
