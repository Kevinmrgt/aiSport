import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import LegalPage from './page';

describe('legal notices', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('renders configured identity, domiciliation and safe contact links as escaped text', () => {
    vi.stubEnv('LEGAL_OPERATOR_NAME', 'Personne Exemple EI');
    vi.stubEnv('LEGAL_OPERATOR_ADDRESS', 'Adresse fictive <script>example</script>');
    vi.stubEnv('LEGAL_OPERATOR_REGISTRATION', 'SIRET synthétique de test');
    vi.stubEnv('LEGAL_PUBLICATION_DIRECTOR', 'Personne Exemple');
    vi.stubEnv('LEGAL_CONTACT_EMAIL', 'contact@example.test');
    vi.stubEnv('LEGAL_CONTACT_PHONE', '+33 1 00 00 00 00');
    vi.stubEnv('LEGAL_HOSTING_NAME', 'Hébergeur fictif');
    vi.stubEnv('LEGAL_HOSTING_CONTACT', 'Adresse et téléphone fictifs');
    vi.stubEnv('LEGAL_DATA_HOSTING_NAME', 'Fournisseur de stockage fictif');
    vi.stubEnv('LEGAL_DATA_HOSTING_CONTACT', 'Adresse de stockage fictive');
    vi.stubEnv('LEGAL_PROCESSING_BASIS', 'Notice synthétique des bases');
    vi.stubEnv('LEGAL_TRANSFERS_NOTICE', 'Notice synthétique des transferts');
    vi.stubEnv('LEGAL_VAT_NUMBER', '');

    const { container, rerender } = render(<LegalPage />);
    expect(screen.getByText('Personne Exemple EI')).toBeTruthy();
    expect(screen.getByText(/Adresse de domiciliation : Adresse fictive <script>/)).toBeTruthy();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText(/Immatriculation : SIRET synthétique/)).toBeTruthy();
    expect(screen.getByText(/Directeur de la publication : Personne Exemple/)).toBeTruthy();
    expect(screen.getByText('Hébergeur fictif')).toBeTruthy();
    expect(screen.getByText('Adresse et téléphone fictifs')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Stockage des données' })).toBeTruthy();
    expect(screen.getByText('Fournisseur de stockage fictif')).toBeTruthy();
    expect(screen.getByText('Adresse de stockage fictive')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'contact@example.test' }).getAttribute('href')).toBe(
      'mailto:contact@example.test',
    );
    expect(screen.getByRole('link', { name: '+33 1 00 00 00 00' }).getAttribute('href')).toBe(
      'tel:+33100000000',
    );
    expect(screen.queryByText(/TVA intracommunautaire/)).toBeNull();
    expect(screen.queryByText(/en évaluation privée/)).toBeNull();

    vi.stubEnv('LEGAL_VAT_NUMBER', 'TVA synthétique');
    rerender(<LegalPage />);
    expect(screen.getByText(/TVA intracommunautaire : TVA synthétique/)).toBeTruthy();
    vi.stubEnv('LEGAL_OPERATOR_ADDRESS', '');
    vi.stubEnv('LEGAL_DATA_HOSTING_NAME', '');
    vi.stubEnv('LEGAL_DATA_HOSTING_CONTACT', '');
    vi.stubEnv('LEGAL_CONTACT_EMAIL', 'contact@example.test?subject=example');
    vi.stubEnv('LEGAL_CONTACT_PHONE', 'javascript:example');
    rerender(<LegalPage />);
    expect(screen.getByText(/en évaluation privée/)).toBeTruthy();
    expect(
      screen.getByText('Identité du fournisseur de stockage des données à confirmer.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Adresse du fournisseur de stockage des données à confirmer.'),
    ).toBeTruthy();
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });
});
