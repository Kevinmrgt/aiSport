import { describe, expect, it } from 'vitest';
import { getTopSports } from './sport-stats';

describe('getTopSports', () => {
  it('agrege les variantes de casse, accents et espaces d un meme sport', () => {
    expect(
      getTopSports({
        'Course à pied': 2,
        ' course a   pied ': 3,
        'COURSE A PIED': 4,
        Yoga: 1,
      }),
    ).toEqual([
      ['Course à pied', 9],
      ['Yoga', 1],
    ]);
  });

  it('applique la limite apres l agregation et stabilise les egalites', () => {
    expect(
      getTopSports(
        {
          Natation: 2,
          Football: 5,
          ' football ': 2,
          Basketball: 6,
          Boxe: 4,
          Tennis: 3,
          Yoga: 1,
        },
        5,
      ),
    ).toEqual([
      ['Football', 7],
      ['Basketball', 6],
      ['Boxe', 4],
      ['Tennis', 3],
      ['Natation', 2],
    ]);
  });

  it('ignore les libelles vides et les compteurs non finis', () => {
    expect(getTopSports({ '   ': 10, Course: Number.NaN, Yoga: 2 })).toEqual([['Yoga', 2]]);
    expect(getTopSports({ Yoga: 2 }, 0)).toEqual([]);
  });
});
