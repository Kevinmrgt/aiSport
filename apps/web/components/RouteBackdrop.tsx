'use client';

import { usePathname } from 'next/navigation';
import { HomeHaloBackground } from '@/components/HomeHaloBackground';
import { AnimatedBackground } from '@/components/AnimatedBackground';

export function RouteBackdrop() {
  const pathname = usePathname();
  if (pathname === '/') return <HomeHaloBackground />;
  return <AnimatedBackground variant="cells" />;
}
