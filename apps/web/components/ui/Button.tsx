import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

// RGAA 4.1: composant Button accessible
// - État loading annoncé aux lecteurs d'écran via aria-busy
// - Désactivé correctement avec aria-disabled
const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-primary-300 text-zinc-950 shadow-2xl shadow-primary-400/25 hover:bg-primary-200 focus-visible:ring-primary-300',
  secondary:
    'border border-white/[0.15] bg-zinc-950/[0.56] text-zinc-100 shadow-xl shadow-black/20 backdrop-blur-xl hover:bg-zinc-950/[0.68] focus-visible:ring-primary-300',
  danger:
    'bg-sport-orange text-zinc-950 shadow-xl shadow-black/30 hover:bg-primary-300 focus-visible:ring-sport-orange',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled ?? isLoading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
      className={[
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-center font-black leading-tight transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {isLoading && (
        <span role="status" className="sr-only">
          Chargement en cours...
        </span>
      )}
      {isLoading && (
        <svg aria-hidden="true" className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
