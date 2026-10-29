'use client';

import { useRef } from 'react';

export interface GenerationResult {
  error?: string;
  retryWithNewOperation?: boolean;
}

/** The key survives retries of the same form, and never leaves component memory. */
export function useGenerationOperation() {
  const operation = useRef<{ signature: string; id: string } | null>(null);
  const submitting = useRef(false);
  return {
    submitting,
    key(input: unknown) {
      const signature = JSON.stringify(input);
      if (operation.current?.signature !== signature) {
        operation.current = { signature, id: crypto.randomUUID() };
      }
      return operation.current.id;
    },
    reset() {
      operation.current = null;
    },
  };
}
