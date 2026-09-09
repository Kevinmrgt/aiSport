'use client';
import { useState } from 'react';
import { Icon } from './ui/Icon';

export function PasswordField() {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor="jury-password" className="field-label">
        Mot de passe
      </label>
      <div className="relative mt-2">
        <input
          id="jury-password"
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          required
          maxLength={256}
          className="field-control pr-14"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-3 flex w-10 items-center justify-center"
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
        >
          <Icon name={visible ? 'eye-slash' : 'eye'} />
        </button>
      </div>
    </div>
  );
}
