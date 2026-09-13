'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function BetaPasswordGuard({ mustChangePassword }: { mustChangePassword: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (mustChangePassword && !['/change-password', '/compte-suspendu'].includes(pathname)) router.replace('/change-password');
  }, [mustChangePassword, pathname, router]);
  return null;
}
