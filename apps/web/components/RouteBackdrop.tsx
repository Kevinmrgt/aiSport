'use client';

import { usePathname } from 'next/navigation';

export function RouteBackdrop() {
  const pathname = usePathname();
  const variant =
    pathname === '/dashboard'
      ? 'performance'
      : /^\/(workouts|programs)\/.+/.test(pathname) && !pathname.endsWith('/generate')
        ? 'motion'
        : pathname === '/programs' || pathname === '/settings'
          ? 'motion'
          : 'textile';
  return (
    <div
      aria-hidden="true"
      className="route-backdrop"
      data-background={variant}
      style={{ backgroundImage: `url('/visuals/refonte-${variant}.webp')` }}
    />
  );
}
