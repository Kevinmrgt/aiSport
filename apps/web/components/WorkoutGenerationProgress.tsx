'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './ui/Icon';
import styles from './WorkoutGenerationProgress.module.css';

// These are preparation topics, not backend progress events or a completion estimate.
const TOPICS: { at: number; label: string; shortLabel?: string; icon: IconName; detail: string }[] = [
  {
    at: 0,
    label: 'Vos objectifs',
    icon: 'target',
    detail: 'Une séance centrée sur ce que vous souhaitez travailler.',
  },
  {
    at: 2,
    label: 'Votre niveau',
    icon: 'sliders',
    detail: 'Une difficulté adaptée à votre expérience.',
  },
  {
    at: 4,
    label: 'Votre matériel',
    icon: 'barbell',
    detail: 'Vos équipements et vos contraintes au cœur de la préparation.',
  },
  {
    at: 7,
    label: 'Les exercices',
    icon: 'activity',
    detail: 'Des mouvements utiles pour votre sport et vos objectifs.',
  },
  {
    at: 10,
    label: 'Les efforts',
    icon: 'zap',
    detail: 'Des séries et des durées adaptées à chaque exercice.',
  },
  {
    at: 14,
    label: 'Les repos',
    icon: 'timer',
    detail: 'Des pauses simples et cohérentes avec les efforts.',
  },
  {
    at: 19,
    label: 'L’enchaînement',
    shortLabel: 'Le déroulé',
    icon: 'layers',
    detail: 'Un déroulé fluide, de l’échauffement au retour au calme.',
  },
  {
    at: 25,
    label: 'L’équilibre de la séance',
    shortLabel: 'La cohérence',
    icon: 'list',
    detail: 'Une séance cohérente, proche de la durée souhaitée.',
  },
];

export function WorkoutGenerationProgress({
  sport,
  durationMinutes,
}: {
  sport: string;
  durationMinutes: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const startedAt = Date.now();
    headingRef.current?.focus();
    const interval = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const activeIndex = TOPICS.reduce(
    (current, topic, index) => (elapsed >= topic.at ? index : current),
    0,
  );
  const topic = TOPICS[activeIndex]!;
  const takingLonger = elapsed >= 40;
  const time = `${Math.floor(elapsed / 60)
    .toString()
    .padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`;

  return (
    <section className={styles.panel} aria-labelledby="generation-heading">
      <div className={styles.context}>
        <span>{sport}</span>
        <span>Cible : {durationMinutes} min</span>
      </div>
      <h3 id="generation-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
        Alcide prépare votre séance
      </h3>
      <div className={styles.orbit} aria-hidden="true">
        <div className={styles.ring} />
        <div className={styles.innerRing} />
        <div key={topic.label} className={styles.symbol}>
          <Icon name={topic.icon} className="h-9 w-9" />
        </div>
      </div>
      <p className={styles.eyebrow}>Les points clés de votre séance</p>
      <div role="status" aria-live="polite" aria-atomic="true" className={styles.status}>
        <div key={takingLonger ? 'waiting' : topic.label} className={styles.message}>
          <p className={styles.title}>{takingLonger ? 'La préparation continue' : topic.label}</p>
          <p className={styles.detail}>
            {takingLonger
              ? 'Cela prend un peu plus de temps. Votre demande est toujours en cours.'
              : topic.detail}
          </p>
        </div>
      </div>
      <div className={styles.topics} aria-hidden="true">
        {TOPICS.map((item, index) => (
          <span
            key={item.label}
            className={`${styles.topic} ${index === activeIndex ? styles.activeTopic : ''}`}
          >
            <Icon name={item.icon} className="h-4 w-4 shrink-0" />
            {item.shortLabel ?? item.label}
          </span>
        ))}
      </div>
      <div className={styles.footer}>
        <p>Votre séance s’affichera dès qu’elle sera prête.</p>
        <span className={styles.elapsed} role="timer" aria-label="Temps écoulé" aria-live="off">
          <Icon name="clock" className="h-4 w-4" /> {time}
        </span>
      </div>
    </section>
  );
}
