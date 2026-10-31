import type {
  AdminIncident,
  IncidentSeverity,
  IncidentSource,
  IncidentStatus,
} from '@alcide/shared';

export const incidentSourceLabels: Record<IncidentSource, string> = {
  api: 'API',
  ai: 'Génération IA',
  web: 'Navigateur',
};
export const incidentSeverityLabels: Record<IncidentSeverity, string> = {
  warning: 'Avertissement',
  error: 'Erreur',
  critical: 'Critique',
};
export const incidentStatusLabels: Record<IncidentStatus, string> = {
  new: 'Nouveau',
  in_progress: 'En cours',
  resolved: 'Résolu',
};

// Descriptions are fixed product copy, never messages from an exception or AI output.
export function incidentSummary(incident: Pick<AdminIncident, 'source' | 'code'>): string {
  const known: Record<string, string> = {
    WEB_REACT_BOUNDARY: 'L’affichage d’une page a été interrompu.',
    WEB_UNHANDLED_ERROR: 'Une erreur non gérée est survenue dans le navigateur.',
    WEB_UNHANDLED_REJECTION: 'Une opération du navigateur a échoué sans traitement.',
    AI_TIMEOUT: 'Le service de génération a dépassé son délai de réponse.',
    AI_PROVIDER_ERROR: 'Le service de génération a signalé une erreur technique.',
    AI_ACCOUNTING_ERROR: 'Le suivi de la consommation IA a échoué.',
    AI_NETWORK_ERROR: 'Le service de génération n’a pas pu être contacté.',
    AI_RESPONSE_INVALID: 'La réponse du service de génération n’a pas pu être utilisée.',
    INTERNAL_ERROR: 'Une erreur interne a interrompu la requête.',
    SERVICE_UNAVAILABLE: 'Un service nécessaire était indisponible.',
    DB_WRITE_FAILED: 'L’enregistrement des données a échoué.',
    STORED_DATA_INVALID: 'Des données enregistrées n’ont pas pu être utilisées.',
    SETTINGS_WRITE_FAILED: 'L’enregistrement des préférences a échoué.',
    PLATFORM_SETTINGS_WRITE_FAILED: 'L’enregistrement des réglages de la plateforme a échoué.',
    QUOTA_RELEASE_FAILED: 'La restitution du quota de génération a échoué.',
    CREDIT_RELEASE_FAILED: 'La restitution des crédits a échoué.',
    OPERATION_FINALIZATION_FAILED: 'La finalisation de l’opération a échoué.',
    FINAL_VALIDATION_FAILED: 'La validation finale de la génération a échoué.',
  };
  return (
    known[incident.code] ??
    (incident.source === 'ai'
      ? 'La génération IA a rencontré un incident.'
      : incident.source === 'web'
        ? 'Le navigateur a rencontré un incident.'
        : 'Une requête API a rencontré un incident.')
  );
}
