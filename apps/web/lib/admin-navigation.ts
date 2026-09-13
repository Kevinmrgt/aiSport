import type { IconName } from '@/components/ui/Icon';
export const adminNavigation: Array<{
  label: string;
  icon: IconName;
  items: Array<{ label: string; href: string }>;
}> = [
  {
    label: 'Pilotage',
    icon: 'chart',
    items: [
      { label: 'Vue d’ensemble', href: '/admin' },
      { label: 'Statistiques', href: '/admin/statistiques' },
    ],
  },
  {
    label: 'Membres',
    icon: 'user',
    items: [{ label: 'Tous les membres', href: '/admin/membres' }],
  },
  {
    label: 'Accès bêta',
    icon: 'spark',
    items: [
      { label: 'Liste des accès', href: '/admin/beta' },
      { label: 'Créer un accès', href: '/admin/beta/nouveau' },
    ],
  },
  {
    label: 'Abonnements et crédits',
    icon: 'zap',
    items: [
      { label: 'Abonnements', href: '/admin/abonnements' },
      { label: 'Dotations et ajustements', href: '/admin/credits' },
    ],
  },
  {
    label: 'Contenus sportifs',
    icon: 'activity',
    items: [
      { label: 'Séances', href: '/admin/seances' },
      { label: 'Programmes', href: '/admin/programmes' },
    ],
  },
  {
    label: 'Configuration',
    icon: 'settings',
    items: [
      { label: 'Modèles IA', href: '/admin/configuration/modeles' },
      { label: 'Règles de la plateforme', href: '/admin/configuration/plateforme' },
    ],
  },
  {
    label: 'Journal',
    icon: 'list',
    items: [{ label: 'Actions administratives', href: '/admin/journal' }],
  },
];
export const adminActionLabels: Record<string, string> = {
  'member.suspended': 'Membre suspendu',
  'member.reactivated': 'Membre réactivé',
  'credits.granted': 'Crédits offerts',
  'beta.created': 'Accès bêta créé',
  'beta.credits': 'Générations bêta ajustées',
  'beta.activated': 'Accès bêta activé',
  'beta.deactivated': 'Accès bêta désactivé',
  'beta.deleted': 'Accès bêta retiré',
  'beta.password_reset': 'Mot de passe réinitialisé',
  'platform.settings': 'Réglages modifiés',
};
export const subscriptionLabels: Record<string, string> = {
  active: 'Actif',
  past_due: 'Paiement en retard',
  canceled: 'Résilié',
  unpaid: 'Impayé',
  trialing: 'Essai',
  incomplete: 'À finaliser',
  incomplete_expired: 'Expiré',
  paused: 'En pause',
};
