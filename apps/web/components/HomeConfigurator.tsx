'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon, type IconName } from './ui/Icon';

const GOALS: Array<{ label: string; icon: IconName }> = [
  { label: 'Gagner en force', icon: 'barbell' },
  { label: 'Améliorer mon endurance', icon: 'run' },
  { label: 'Retrouver la forme', icon: 'heart' },
];

export function HomeConfigurator() {
  const [goal, setGoal] = useState('Retrouver la forme');
  const [duration, setDuration] = useState(30);
  const href = '/generate?' + new URLSearchParams({ goal, duration: String(duration) }).toString();
  return (
    <div className="glass-panel home-configurator" data-glass="primary">
      <fieldset>
        <legend>Votre objectif</legend>
        <div className="goal-options">
          {GOALS.map((item) => (
            <label key={item.label} className="goal-option">
              <input
                type="radio"
                name="goal"
                value={item.label}
                checked={goal === item.label}
                onChange={() => setGoal(item.label)}
              />
              <span className="goal-option-content">
                <Icon name={item.icon} className="h-9 w-9 shrink-0" />
                <span>{item.label}</span>
                {goal === item.label && <Icon name="check" className="goal-check h-5 w-5" />}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="home-configurator-bottom">
        <fieldset className="duration-picker">
          <legend>Votre temps</legend>
          <div className="duration-options">
            {[20, 30, 45].map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="duration"
                  value={value}
                  checked={duration === value}
                  onChange={() => setDuration(value)}
                />
                <span>{value} min</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Link href={href} className="action-primary">
          Personnaliser ma séance <Icon name="arrow-right" className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
}
