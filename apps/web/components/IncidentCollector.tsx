'use client';

import { useEffect } from 'react';
import { reportBrowserIncident } from '@/lib/browser-incidents';

export function IncidentCollector() {
  useEffect(() => {
    const onError = () => reportBrowserIncident('unhandled_error');
    const onRejection = () => reportBrowserIncident('unhandled_rejection');
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
