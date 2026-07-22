'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type MouseEvent, useEffect, useState } from 'react';
import { Icon, type IconName } from './ui/Icon';

interface ActiveNavLinkProps {
  href: string;
  label: string;
  icon: IconName;
  compact?: boolean;
}

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ActiveNavLink({ href, label, icon, compact = false }: ActiveNavLinkProps) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);
  const [isPending, setIsPending] = useState(false);
  const highlighted = active || isPending;

  useEffect(() => {
    setIsPending(false);
  }, [pathname]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      active ||
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    setIsPending(true);
  }

  if (compact) {
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        aria-busy={isPending ? 'true' : undefined}
        onClick={handleClick}
        className={`group grid min-w-0 place-items-center gap-1 rounded-full px-2 py-1.5 text-[0.62rem] font-bold transition ${
          highlighted ? 'text-primary-200' : 'text-zinc-200 hover:text-white'
        }`}
      >
        <span
          className={`grid h-10 w-10 place-items-center rounded-full border shadow-lg shadow-black/20 transition ${
            highlighted
              ? `border-primary-300 bg-primary-300 text-zinc-950 shadow-primary-400/20 ${
                  isPending ? 'animate-pulse' : ''
                }`
              : 'border-white/10 bg-white/[0.06] text-zinc-200 group-hover:border-primary-300/[0.45] group-hover:bg-primary-300 group-hover:text-zinc-950'
          }`}
        >
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      aria-busy={isPending ? 'true' : undefined}
      onClick={handleClick}
      className={`group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-bold transition ${
        highlighted ? 'text-primary-200' : 'text-zinc-200 hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      {highlighted && (
        <span className="absolute inset-x-2 -bottom-0.5 hidden h-0.5 rounded-full bg-primary-300 lg:block" />
      )}
      <span
        className={`grid h-8 w-8 place-items-center rounded-full transition ${
          highlighted
            ? `bg-primary-300 text-zinc-950 ${isPending ? 'animate-pulse' : ''}`
            : 'bg-white/[0.06] text-zinc-200 group-hover:bg-white/[0.1] group-hover:text-white'
        }`}
      >
        <Icon name={icon} className="h-3.5 w-3.5" />
      </span>
      <span className="hidden lg:block">{label}</span>
    </Link>
  );
}
