import { db } from '../db/index.js';
import { pageVisits } from '../db/schema.js';

// Une visite est volontairement minimale : aucun identifiant de personne ni
// chemin consulté n'est stocké. Le tableau Admin ne consomme que des totaux par jour.
export async function recordPageVisit(): Promise<void> {
  await db.insert(pageVisits).values({});
}
