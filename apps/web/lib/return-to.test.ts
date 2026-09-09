import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './return-to';

describe('retour après connexion', () => {
  it('conserve la destination interne avec les choix de séance', () => {
    expect(safeReturnTo('/generate?goal=Gagner+en+force&duration=45')).toBe(
      '/generate?goal=Gagner+en+force&duration=45',
    );
    expect(safeReturnTo('/programs/123#week-2')).toBe('/programs/123#week-2');
  });

  it.each([
    undefined,
    'https://exemple.test',
    '//exemple.test',
    '/\\exemple.test',
    '/\n/exemple.test',
    '/login?callbackUrl=/login',
    'javascript:alert(1)',
  ])('refuse une destination externe ou une boucle : %s', (value) => {
    expect(safeReturnTo(value)).toBe('/generate');
  });
});
