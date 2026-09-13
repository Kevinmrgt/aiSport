'use client';
import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { performAdminAction, type AdminActionResult } from '@/app/(administration)/admin/actions';
export function AdminActionForm({
  operation,
  hidden = {},
  children,
  label,
  successMessage,
  confirm,
  danger = false,
}: {
  operation: string;
  hidden?: Record<string, string>;
  children?: React.ReactNode;
  label: string;
  successMessage: string;
  confirm?: string;
  danger?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AdminActionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const running = useRef(false);
  const request = useRef<{ payload: string; id: string } | null>(null);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current || (confirm && !window.confirm(confirm))) return;
    const form = new FormData(event.currentTarget);
    const payload = JSON.stringify([...form.entries()]);
    if (!request.current || request.current.payload !== payload)
      request.current = { payload, id: crypto.randomUUID() };
    form.set('requestId', request.current.id);
    running.current = true;
    setPending(true);
    setResult(null);
    setCopied(false);
    try {
      const response = await performAdminAction(operation, form);
      setResult(response);
      if (response.success) {
        request.current = null;
      }
    } catch {
      setResult({
        error:
          'La réponse n’a pas pu être reçue. Vous pouvez réessayer sans doubler une dotation de crédits.',
      });
    } finally {
      running.current = false;
      setPending(false);
    }
  }
  return (
    <form
      className="admin-form"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <fieldset disabled={pending} className="grid gap-4">
        {children}
        <div>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} isLoading={pending}>
            {label}
          </Button>
        </div>
      </fieldset>
      {result?.error && (
        <p role="alert" className="admin-notice">
          {result.error}
        </p>
      )}
      {result?.success && (
        <div role="status" className="admin-notice">
          <p>{successMessage}</p>
          {result.temporaryPassword && (
            <>
              <p className="mt-2">
                Mot de passe temporaire : copiez-le avant de quitter cette page.
              </p>
              <p className="admin-secret">
                <code>{result.temporaryPassword}</code>
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(result.temporaryPassword!).then(
                    () => setCopied(true),
                    () => setCopied(false),
                  );
                }}
              >
                {copied ? 'Copié' : 'Copier le mot de passe'}
              </Button>
            </>
          )}
          {result.userId && (
            <p className="mt-3">
              <Link
                prefetch={false}
                href={`/admin/membres/${result.userId}`}
                className="underline underline-offset-4"
              >
                Ouvrir la fiche membre
              </Link>
            </p>
          )}
        </div>
      )}
    </form>
  );
}
export function ReasonField() {
  return (
    <label>
      Motif
      <input
        name="reason"
        required
        minLength={3}
        maxLength={500}
        placeholder="Expliquez cette modification"
        className="field-control"
      />
    </label>
  );
}
