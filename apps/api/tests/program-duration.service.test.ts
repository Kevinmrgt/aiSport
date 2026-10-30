import { describe, expect, it } from 'vitest';
import type { ProgramSession } from '@alcide/shared';
import {
  getProgramSessionTimedSeconds,
  normalizeProgramSessionDuration,
  ProgramDurationError,
} from '../src/services/program-duration.service.js';

function session(): ProgramSession {
  return {
    session_number: 1,
    title: 'Technique',
    focus: 'Mouvement contrôlé',
    duration_minutes: 20,
    exercises: [
      {
        name: 'Bloc de force',
        description: 'Gardez le dos neutre ; arrêtez si inconfort.',
        tips: 'Mouvement contrôlé, charge légère.',
        sets: 3,
        reps: '8',
        duration_seconds: 480,
        rest_seconds: 120,
      },
      {
        name: 'Bloc de mobilité',
        description: 'Amplitude confortable.',
        tips: 'Pas de mouvement forcé.',
        duration_seconds: 480,
        rest_seconds: 120,
      },
    ],
  };
}

describe('programme : validation sans altération des consignes', () => {
  it('préserve exactement descriptions, conseils, séries et répétitions du contenu cohérent', () => {
    const source = session();
    const result = normalizeProgramSessionDuration(source, 20);
    expect(result).toEqual(source);
    expect(result).not.toBe(source);
    expect(getProgramSessionTimedSeconds(result)).toBe(1200);
    result.exercises[0]!.description = 'édition du clone';
    expect(source.exercises[0]!.description).toContain('dos neutre');
  });

  it('refuse les deux exercices de 20s au lieu de les étirer vers deux fois 600s', () => {
    const source = session();
    source.exercises.forEach((exercise) => {
      exercise.duration_seconds = 20;
      exercise.rest_seconds = 0;
    });
    const before = structuredClone(source);
    expect(() => normalizeProgramSessionDuration(source, 20)).toThrow(ProgramDurationError);
    expect(source).toEqual(before);
  });

  it('ne répare pas un petit écart qui pourrait contredire une consigne en répétitions', () => {
    const source = session();
    source.exercises[0]!.duration_seconds = 479;
    expect(() => normalizeProgramSessionDuration(source, 20)).toThrow(ProgramDurationError);
  });

  it('refuse une durée absente, même si les autres blocs compensent le total', () => {
    const source = session();
    delete source.exercises[0]!.duration_seconds;
    source.exercises[1]!.duration_seconds = 960;
    expect(() => normalizeProgramSessionDuration(source, 20)).toThrow(ProgramDurationError);
  });
});
