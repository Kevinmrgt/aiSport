import { adminApi } from '@/lib/admin-api';
import { AdminHeading, Badge } from '@/components/admin/AdminPrimitives';
import { AdminActionForm } from '@/components/admin/AdminActionForm';
export default async function ModelsPage() {
  const { settings, availableModels } = await adminApi.settings();
  return (
    <>
      <AdminHeading
        eyebrow="Configuration"
        title="Modèles IA"
        description="Choisissez le modèle appliqué aux membres qui n’ont pas défini de préférence individuelle."
      />
      <section className="admin-panel">
        <div className="admin-section-head">
          <h2>Modèle de la plateforme</h2>
          <Badge>
            {availableModels.find((m) => m.id === settings.defaultAiModel)?.label ??
              settings.defaultAiModel}
          </Badge>
        </div>
        <AdminActionForm
          operation="settings.model"
          label="Enregistrer le modèle"
          successMessage="Le modèle par défaut a été enregistré."
        >
          <div className="admin-model-grid">
            {availableModels.map((m) => (
              <label key={m.id} className="admin-model">
                <div>
                  <input
                    type="radio"
                    name="defaultAiModel"
                    value={m.id}
                    defaultChecked={m.id === settings.defaultAiModel}
                    required
                  />
                  {m.label}
                </div>
                <span>
                  {m.id === settings.defaultAiModel
                    ? 'Modèle par défaut actuel'
                    : 'Disponible pour la plateforme'}
                </span>
              </label>
            ))}
          </div>
        </AdminActionForm>
      </section>
    </>
  );
}
