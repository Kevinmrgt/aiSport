'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { adminNavigation } from '@/lib/admin-navigation';

function Navigation({ close }: { close?: () => void }) {
  const pathname = usePathname();
  const all = adminNavigation.flatMap((group) => group.items);
  const current = [...all]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) =>
        pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`)),
    );
  return (
    <nav aria-label="Navigation administration" className="admin-navigation">
      {adminNavigation.map((group) => (
        <section key={group.label}>
          <p className="admin-nav-group">
            <Icon name={group.icon} className="h-4 w-4" />
            {group.label}
          </p>
          {group.items.map((item) => (
            <Link
              prefetch={false}
              key={item.href}
              href={item.href}
              onClick={close}
              aria-current={current?.href === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </section>
      ))}
    </nav>
  );
}

export function AdminShell({
  children,
  email,
  signOutAction,
}: {
  children: React.ReactNode;
  email: string;
  signOutAction: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (dialog.current?.open) dialog.current.close();
  }, [pathname]);
  const current = adminNavigation
    .flatMap((group) => group.items)
    .find((item) => item.href === pathname);
  const parent = adminNavigation
    .flatMap((group) => group.items)
    .filter((item) => item.href !== '/admin' && pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const close = () => dialog.current?.close();
  const brand = (
    <Link prefetch={false} href="/admin" className="admin-brand">
      Alcide<span>Administration</span>
    </Link>
  );
  return (
    <div className="admin-workspace">
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>
      <aside className="admin-sidebar">
        {brand}
        <Navigation />
        <div className="admin-sidebar-bottom">
          <Link prefetch={false} href="/dashboard">
            <Icon name="arrow-left" />
            Retour à l’application
          </Link>
          <p>{email}</p>
          <form action={signOutAction}>
            <button type="submit">Se déconnecter</button>
          </form>
        </div>
      </aside>
      <dialog
        ref={dialog}
        className="admin-drawer"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => menuButton.current?.focus()}
        aria-label="Menu administration"
      >
        <div className="admin-drawer-inner">
          <div className="flex items-start justify-between gap-4">
            {brand}
            <button
              type="button"
              onClick={close}
              className="admin-close"
              aria-label="Fermer le menu"
            >
              ×
            </button>
          </div>
          <Navigation close={close} />
          <Link prefetch={false} href="/dashboard" className="admin-back" onClick={close}>
            Retour à l’application
          </Link>
          <form action={signOutAction}>
            <button className="admin-back" type="submit">
              Se déconnecter
            </button>
          </form>
        </div>
      </dialog>
      <div className="admin-main-wrap">
        <header className="admin-topbar">
          <button
            ref={menuButton}
            className="admin-menu-button"
            type="button"
            onClick={() => dialog.current?.showModal()}
            aria-label="Ouvrir le menu administration"
          >
            <Icon name="menu" />
          </button>
          <nav aria-label="Fil d’Ariane" className="admin-breadcrumb">
            <Link prefetch={false} href="/admin">
              Administration
            </Link>
            {parent && (
              <>
                <span aria-hidden="true">/</span>
                <Link prefetch={false} href={parent.href}>
                  {parent.label}
                </Link>
              </>
            )}
            {pathname !== '/admin' && (
              <>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{current?.label ?? 'Détail'}</span>
              </>
            )}
          </nav>
          <Link
            prefetch={false}
            className="admin-top-return"
            href="/dashboard"
            aria-label="Retour à l’application"
          >
            <span className="admin-return-label">Retour à l’application</span>
            <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
        </header>
        <main id="main-content" tabIndex={-1} className="admin-main">
          {children}
        </main>
        <footer className="admin-footer">
          Alcide · Espace administrateur
          <Link prefetch={false} href="/confidentialite">
            Confidentialité
          </Link>
        </footer>
      </div>
    </div>
  );
}
