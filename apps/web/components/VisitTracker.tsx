'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const VISITS_ENDPOINT = '/api/analytics/visits';

export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    // Le beacon ne contient volontairement aucune donnée : le serveur agrège
    // uniquement une ouverture de page, sans identité ni URL consultée.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(VISITS_ENDPOINT);
      return;
    }

    void fetch(VISITS_ENDPOINT, { method: 'POST', keepalive: true }).catch(() => undefined);
  }, [pathname]);

  return null;
}
