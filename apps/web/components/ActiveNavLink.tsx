'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  if (compact) {
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`group grid min-w-0 place-items-center gap-1 rounded-full px-2 py-1.5 text-[0.62rem] font-bold transition ${
          active ? 'text-primary-200' : 'text-zinc-400 hover:text-white'
        }`}
      >
        <span
          className={`grid h-10 w-10 place-items-center rounded-full border shadow-lg shadow-black/20 transition ${
            active
              ? 'border-primary-300 bg-primary-300 text-zinc-950 shadow-primary-400/20'
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
      className={`group relative flex items-center gap-3 rounded-full border px-3 py-2 text-sm font-bold transition ${
        active
          ? 'border-primary-300/30 bg-primary-300/[0.1] text-white shadow-lg shadow-primary-400/10'
          : 'border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[0.07] hover:text-white'
      }`}
    >
      {active && (
        <span className="absolute -left-1 top-1/2 hidden h-8 w-1 -translate-y-1/2 rounded-full bg-primary-300 xl:block" />
      )}
      <span
        className={`grid h-10 w-10 place-items-center rounded-full transition ${
          active
            ? 'bg-primary-300 text-zinc-950 shadow-xl shadow-primary-400/20'
            : 'bg-white/[0.07] text-zinc-200 group-hover:bg-primary-300 group-hover:text-zinc-950'
        }`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="hidden xl:block">{label}</span>
    </Link>
  );
}
