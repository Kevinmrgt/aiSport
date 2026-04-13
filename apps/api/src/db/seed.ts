/**
 * Script de seed — données de démonstration pour la soutenance RNCP
 * Usage: pnpm --filter api db:seed
 *
 * Crée un utilisateur de démo et 3 workouts variés sans nécessiter Mistral AI.
 */
import 'dotenv/config';
import { db } from './index.js';
import { users, workouts } from './schema.js';
import type { Workout } from '@sportcoach/shared';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_EMAIL = 'demo@sportcoach.ia';

const demoWorkouts: Array<{
  title: string;
  sport: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationMinutes: number;
  data: Workout;
}> = [
  {
    title: 'Cardio Débutant — Course à pied',
    sport: 'Course à pied',
    difficulty: 'beginner',
    durationMinutes: 30,
    data: {
      title: 'Cardio Débutant — Course à pied',
      sport: 'Course à pied',
      difficulty: 'beginner',
      duration_minutes: 30,
      warmup: [
        { name: 'Marche rapide', duration_seconds: 120, description: 'Augmenter progressivement le rythme cardiaque' },
        { name: 'Étirements dynamiques jambes', duration_seconds: 60, description: 'Cercles de chevilles, genoux, hanches' },
      ],
      exercises: [
        { name: 'Jogging léger', duration_seconds: 300, rest_seconds: 60, sets: 3, description: 'Rythme conversationnel, pas de sprint' },
        { name: 'Marche active', duration_seconds: 120, rest_seconds: 30, sets: 3, description: 'Récupération active entre les blocs de course' },
      ],
      cooldown: [
        { name: 'Marche lente', duration_seconds: 120, description: 'Retour progressif au calme' },
        { name: 'Étirements statiques mollets', duration_seconds: 60, description: 'Tenir 30s chaque jambe' },
      ],
    },
  },
  {
    title: 'Force Intermédiaire — Musculation haut du corps',
    sport: 'Musculation',
    difficulty: 'intermediate',
    durationMinutes: 45,
    data: {
      title: 'Force Intermédiaire — Musculation haut du corps',
      sport: 'Musculation',
      difficulty: 'intermediate',
      duration_minutes: 45,
      warmup: [
        { name: 'Rotation épaules', duration_seconds: 60, description: 'Cercles avant et arrière, amplitude croissante' },
        { name: 'Push-ups légers', duration_seconds: 60, description: '10 répétitions, lent et contrôlé' },
      ],
      exercises: [
        { name: 'Développé couché', rest_seconds: 90, sets: 4, description: '8-10 répétitions, charge modérée' },
        { name: 'Tirage horizontal', rest_seconds: 90, sets: 3, description: 'Ramener les coudes vers les hanches' },
        { name: 'Élévations latérales', rest_seconds: 60, sets: 3, description: 'Contrôle à la descente, poids légers' },
        { name: 'Curl biceps', rest_seconds: 60, sets: 3, description: 'Alterner les bras, mouvement complet' },
      ],
      cooldown: [
        { name: 'Étirement pectoraux au mur', duration_seconds: 60, description: 'Bras tendu à 90°, ouvrir la cage thoracique' },
        { name: 'Étirement dorsaux', duration_seconds: 60, description: 'Accroupi, bras tendus devant, dos rond' },
      ],
    },
  },
  {
    title: 'HIIT Avancé — Full Body',
    sport: 'HIIT',
    difficulty: 'advanced',
    durationMinutes: 25,
    data: {
      title: 'HIIT Avancé — Full Body',
      sport: 'HIIT',
      difficulty: 'advanced',
      duration_minutes: 25,
      warmup: [
        { name: 'Jumping jacks', duration_seconds: 30, description: 'Activation cardio-vasculaire rapide' },
        { name: 'High knees', duration_seconds: 30, description: 'Genoux à la hauteur des hanches' },
      ],
      exercises: [
        { name: 'Burpees', duration_seconds: 40, rest_seconds: 20, sets: 4, description: 'Explosion maximale, atterrissage contrôlé' },
        { name: 'Mountain climbers', duration_seconds: 40, rest_seconds: 20, sets: 4, description: 'Tempo élevé, gainage strict' },
        { name: 'Box jumps', duration_seconds: 30, rest_seconds: 30, sets: 3, description: 'Sauter, atterrir les deux pieds simultanément' },
        { name: 'Sprint sur place', duration_seconds: 20, rest_seconds: 10, sets: 8, description: 'Tabata — effort maximal' },
      ],
      cooldown: [
        { name: 'Marche lente', duration_seconds: 90, description: 'Retour au calme progressif' },
        { name: 'Étirements full body', duration_seconds: 120, description: 'Quadriceps, ischio-jambiers, épaules, dos' },
      ],
    },
  },
];

async function seed() {
  console.info('[Seed] Démarrage du seed de démonstration…');

  // Insérer l'utilisateur de démo (upsert)
  await db
    .insert(users)
    .values({
      id: DEMO_USER_ID as unknown as string,
      name: 'Utilisateur Démo',
      email: DEMO_EMAIL,
    })
    .onConflictDoNothing();

  console.info(`[Seed] Utilisateur démo créé : ${DEMO_EMAIL}`);

  // Insérer les workouts de démo
  for (const workout of demoWorkouts) {
    await db
      .insert(workouts)
      .values({
        userId: DEMO_USER_ID as unknown as string,
        title: workout.title,
        sport: workout.sport,
        difficulty: workout.difficulty,
        durationMinutes: workout.durationMinutes,
        data: workout.data,
      })
      .onConflictDoNothing();

    console.info(`[Seed] Workout créé : ${workout.title}`);
  }

  console.info('[Seed] Seed terminé — 3 workouts de démonstration disponibles.');
  process.exit(0);
}

seed().catch((err: unknown) => {
  console.error('[Seed] Erreur :', err);
  process.exit(1);
});
