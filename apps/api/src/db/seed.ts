/**
 * Script de seed — données de démonstration pour la soutenance RNCP
 * Usage: pnpm --filter api db:seed
 *
 * Cree un utilisateur de demo et 3 workouts varies sans necessiter d'appel IA externe.
 */
import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { db } from './index.js';
import { users, workouts } from './schema.js';
import type { Workout } from '@alcide/shared';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_EMAIL = 'demo@alcide.app';

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
        { name: 'Jogging léger', duration_seconds: 900, rest_seconds: 60, sets: 3, description: 'Rythme conversationnel, pas de sprint' },
        { name: 'Marche active', duration_seconds: 450, rest_seconds: 30, sets: 3, description: 'Récupération active entre les blocs de course' },
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
        { name: 'Développé couché', duration_seconds: 600, rest_seconds: 90, sets: 4, description: '8-10 répétitions dans le temps alloué, charge modérée' },
        { name: 'Tirage horizontal', duration_seconds: 600, rest_seconds: 90, sets: 3, description: 'Ramener les coudes vers les hanches dans le temps alloué' },
        { name: 'Élévations latérales', duration_seconds: 480, rest_seconds: 60, sets: 3, description: 'Contrôle à la descente, poids légers, dans le temps alloué' },
        { name: 'Curl biceps', duration_seconds: 480, rest_seconds: 60, sets: 3, description: 'Alterner les bras et respecter le temps alloué' },
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
        { name: 'Burpees', duration_seconds: 300, rest_seconds: 20, sets: 4, description: 'Explosion maximale, atterrissage contrôlé' },
        { name: 'Mountain climbers', duration_seconds: 300, rest_seconds: 20, sets: 4, description: 'Tempo élevé, gainage strict' },
        { name: 'Box jumps', duration_seconds: 275, rest_seconds: 30, sets: 3, description: 'Sauter, atterrir les deux pieds simultanément' },
        { name: 'Sprint sur place', duration_seconds: 275, rest_seconds: 10, sets: 8, description: 'Intervalles à effort maximal dans le temps alloué' },
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
    const [existing] = await db
      .select({ id: workouts.id })
      .from(workouts)
      .where(and(eq(workouts.userId, DEMO_USER_ID), eq(workouts.title, workout.title)))
      .limit(1);

    if (existing) {
      console.info(`[Seed] Workout deja present : ${workout.title}`);
      continue;
    }

    await db
      .insert(workouts)
      .values({
        userId: DEMO_USER_ID as unknown as string,
        title: workout.title,
        sport: workout.sport,
        difficulty: workout.difficulty,
        durationMinutes: workout.durationMinutes,
        data: workout.data,
      });

    console.info(`[Seed] Workout créé : ${workout.title}`);
  }

  console.info('[Seed] Seed terminé — 3 workouts de démonstration disponibles.');
  process.exit(0);
}

seed().catch((err: unknown) => {
  console.error('[Seed] Erreur :', err);
  process.exit(1);
});
