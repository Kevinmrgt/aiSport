import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Button } from './Button';
import { Icon } from './Icon';
import { Input } from './Input';
import { Select } from './Select';

describe('controles de formulaire accessibles', () => {
  afterEach(cleanup);

  it('desactive et annonce un bouton en chargement', () => {
    render(<Button isLoading>Enregistrer</Button>);

    const button = screen.getByRole('button', { name: /enregistrer/i });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain('Chargement');
  });

  it('respecte un bouton desactive sans etat de chargement', () => {
    render(<Button variant="danger" size="sm" disabled>Supprimer</Button>);

    const button = screen.getByRole('button', { name: 'Supprimer' });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('false');
  });

  it('relie le label, l aide et l erreur a un champ', () => {
    render(<Input label="Sport favori" hint="Discipline" error="Champ requis" required />);

    const input = screen.getByLabelText(/sport favori/i);
    expect(input.id).toBe('input-sport-favori');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(
      'input-sport-favori-hint input-sport-favori-error',
    );
    expect(screen.getByRole('alert').textContent).toBe('Champ requis');
  });

  it('rend le placeholder et toutes les options du select', () => {
    render(
      <Select
        label="Niveau"
        placeholder="Choisir"
        options={[
          { value: 'beginner', label: 'Debutant' },
          { value: 'advanced', label: 'Avance' },
        ]}
      />,
    );

    const select = screen.getByLabelText<HTMLSelectElement>('Niveau');
    expect(select.id).toBe('select-niveau');
    expect(select.options).toHaveLength(3);
    expect(select.options[0]?.disabled).toBe(true);
  });

  it('marque les icones comme decoratives', () => {
    const { container } = render(<Icon name="activity" className="icone-test" />);
    const svg = container.querySelector('svg');

    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('class')).toBe('icone-test');
    expect(svg?.querySelector('path')?.getAttribute('d')).toBeTruthy();
  });
});
