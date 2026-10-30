'use client';

import { useEffect, useState } from 'react';

/** Keep native form submission disabled until React can handle and validate it. */
export function useFormReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
