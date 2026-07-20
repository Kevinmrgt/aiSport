type SportCount = readonly [label: string, count: number];

function collapseWhitespace(label: string): string {
  return label.trim().replace(/\s+/gu, ' ');
}

function sportKey(label: string): string {
  return collapseWhitespace(label)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr-FR');
}

function accentedCharacterCount(label: string): number {
  return Array.from(label).filter((character) => character.normalize('NFD').length > 1).length;
}

function displayLabel(current: string, candidate: string): string {
  const accentDifference = accentedCharacterCount(candidate) - accentedCharacterCount(current);
  if (accentDifference !== 0) return accentDifference > 0 ? candidate : current;

  const currentIsAllCaps = current === current.toLocaleUpperCase('fr-FR');
  const candidateIsAllCaps = candidate === candidate.toLocaleUpperCase('fr-FR');
  if (currentIsAllCaps !== candidateIsAllCaps) return currentIsAllCaps ? candidate : current;

  return current;
}

/**
 * Regroupe les variantes typographiques d'un sport avant de calculer le classement.
 */
export function getTopSports(
  bySport: Readonly<Record<string, number>>,
  limit = 5,
): SportCount[] {
  if (limit <= 0) return [];

  const grouped = new Map<string, { label: string; count: number }>();

  for (const [rawLabel, count] of Object.entries(bySport)) {
    const label = collapseWhitespace(rawLabel);
    const key = sportKey(label);
    if (!key || !Number.isFinite(count)) continue;

    const existing = grouped.get(key);
    grouped.set(key, {
      label: existing ? displayLabel(existing.label, label) : label,
      count: (existing?.count ?? 0) + count,
    });
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr-FR'))
    .slice(0, limit)
    .map(({ label, count }) => [label, count]);
}
