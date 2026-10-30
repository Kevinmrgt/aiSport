import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const { pathnameMock } = vi.hoisted(() => ({ pathnameMock: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: pathnameMock }));

import { VisitTracker } from './VisitTracker';

describe('VisitTracker', () => {
  const sendBeacon = vi.fn();

  beforeEach(() => {
    pathnameMock.mockReturnValue('/dashboard');
    sendBeacon.mockReset();
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: sendBeacon });
  });

  afterEach(() => cleanup());

  it('envoie un signal de visite sans donnée personnelle ni URL', () => {
    render(<VisitTracker />);

    expect(sendBeacon).toHaveBeenCalledWith('/api/analytics/visits');
  });
});
