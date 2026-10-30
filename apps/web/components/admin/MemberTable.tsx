import Link from 'next/link';
import type { AdminMember } from '@alcide/shared';
import { AdminTable, Badge, dateLabel } from './AdminPrimitives';
import { subscriptionLabels } from '@/lib/admin-navigation';
export function MemberTable({ members }: { members: AdminMember[] }) {
  return (
    <AdminTable
      caption="Membres de la plateforme"
      headers={['Membre', 'Compte', 'Accès bêta', 'Abonnement', 'Crédits standard', 'Inscription']}
    >
      {members.map((member) => (
        <tr key={member.id}>
          <td>
            <div className="admin-identity">
              <span className="admin-avatar" aria-hidden="true">
                {(member.name ?? member.email).slice(0, 2).toUpperCase()}
              </span>
              <div>
                <Link prefetch={false} href={`/admin/membres/${member.id}`}>
                  {member.name ?? member.email}
                </Link>
                <small>{member.email}</small>
              </div>
            </div>
          </td>
          <td>
            <Badge tone={member.suspendedAt ? 'danger' : 'success'}>
              {member.suspendedAt ? 'Suspendu' : 'Actif'}
            </Badge>
            {member.isAdmin && <small>Administrateur</small>}
          </td>
          <td>
            {member.beta ? (
              <>
                <Badge tone={member.beta.active ? 'success' : 'neutral'}>
                  {member.beta.active ? 'Activé' : 'Désactivé'}
                </Badge>
                <small>
                  {member.beta.remaining} génération{member.beta.remaining !== 1 ? 's' : ''}
                  {member.beta.mustChangePassword ? ' · Mot de passe à modifier' : ''}
                </small>
              </>
            ) : (
              <span className="muted-copy">Aucun</span>
            )}
          </td>
          <td>
            {member.subscription ? (
              <Badge
                tone={
                  ['past_due', 'unpaid', 'incomplete'].includes(member.subscription.status)
                    ? 'warning'
                    : 'neutral'
                }
              >
                {subscriptionLabels[member.subscription.status] ?? member.subscription.status}
              </Badge>
            ) : (
              'Sans abonnement'
            )}
          </td>
          <td>
            {member.credits.welcome + member.credits.premium + member.credits.offered}
            <small>
              {member.credits.welcome} accueil · {member.credits.premium} Premium ·{' '}
              {member.credits.offered} offerts
            </small>
          </td>
          <td>{dateLabel(member.createdAt)}</td>
        </tr>
      ))}
    </AdminTable>
  );
}
