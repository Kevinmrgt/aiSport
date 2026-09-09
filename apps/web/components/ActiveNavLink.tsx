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
        className={`group grid min-h-11 min-w-0 content-start place-items-center gap-1 rounded-full px-0.5 py-1 text-center text-[0.68rem] font-bold [overflow-wrap:anywhere] transition ${
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
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      aria-busy={isPending ? 'true' : undefined}
      onClick={handleClick}
      className={`nav-link ${highlighted ? 'text-primary-100' : ''}`}
    >
      {label}
    </Link>
  );
}
