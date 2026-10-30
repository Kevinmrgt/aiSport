import { adminApi } from '@/lib/admin-api';
import { AdminHeading } from '@/components/admin/AdminPrimitives';
import { AdminActionForm } from '@/components/admin/AdminActionForm';
export default async function CreateBetaPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; name?: string }>;
}) {
  const initial = await searchParams;
  const { settings } = await adminApi.settings();
  return (
    <>
      <AdminHeading
        eyebrow="Accès bêta"
        title="Créer un accès"
        description="Le membre recevra un mot de passe temporaire à modifier lors de sa première connexion."
      />
      <section className="admin-panel">
        <AdminActionForm
          operation="beta.create"
          label="Créer l’accès bêta"
          successMessage="L’accès bêta a été créé. Transmettez les identifiants au membre par votre canal habituel."
        >
          <label>
            Nom
            <input
              name="name"
              defaultValue={initial.name ?? ''}
              required
              maxLength={128}
              autoComplete="name"
              className="field-control"
            />
          </label>
          <label>
            Adresse e-mail
            <input
              name="email"
              defaultValue={initial.email ?? ''}
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              className="field-control"
            />
          </label>
          <label>
            Générations initiales
            <input
              name="generationBalance"
              type="number"
              min={0}
              max={10000}
              required
              defaultValue={settings.defaultBetaGenerationBalance}
              className="field-control"
            />
          </label>
          <p className="muted-copy text-xs">
            Si cette adresse appartient déjà à un membre, l’accès bêta sera ajouté à sa fiche
            existante.
          </p>
        </AdminActionForm>
      </section>
    </>
  );
}
