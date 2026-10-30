import { adminApi } from '@/lib/admin-api';
import { AdminHeading } from '@/components/admin/AdminPrimitives';
import { AdminActionForm } from '@/components/admin/AdminActionForm';
export default async function PlatformPage() {
  const { settings } = await adminApi.settings();
  return (
    <>
      <AdminHeading
        eyebrow="Configuration"
        title="Règles de la plateforme"
        description="Définissez la dotation proposée lors de la création d’un nouvel accès bêta."
      />
      <section className="admin-panel">
        <h2 className="mb-4">Dotation bêta initiale</h2>
        <p className="muted-copy mb-6">
          Valeur enregistrée : {settings.defaultBetaGenerationBalance} générations. Les soldes des
          accès existants restent inchangés.
        </p>
        <AdminActionForm
          operation="settings.balance"
          label="Enregistrer la règle"
          successMessage="La dotation bêta par défaut a été enregistrée."
        >
          <label>
            Générations proposées
            <input
              key={settings.defaultBetaGenerationBalance}
              type="number"
              name="defaultBetaGenerationBalance"
              min={1}
              max={10000}
              required
              defaultValue={settings.defaultBetaGenerationBalance}
              className="field-control"
            />
          </label>
        </AdminActionForm>
      </section>
    </>
  );
}
