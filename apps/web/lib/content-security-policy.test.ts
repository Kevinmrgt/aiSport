import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy } from './content-security-policy';

describe('production content security policy', () => {
  it('requires a nonce for scripts and keeps the API URL to its origin', () => {
    const policy = contentSecurityPolicy(
      'fresh-random-value',
      false,
      'https://api.example.test/path?q=private',
    );
    const scripts = policy.split('; ').find((part) => part.startsWith('script-src'));
    expect(scripts).toContain("'nonce-fresh-random-value'");
    expect(scripts).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(policy).toContain("connect-src 'self' https://api.example.test");
    expect(policy).not.toContain('private');
  });

  it('permits local hot reload without forcing HTTP development to HTTPS', () => {
    const policy = contentSecurityPolicy(
      'development-request-nonce',
      true,
      'http://localhost:3001',
    );
    const scripts = policy.split('; ').find((part) => part.startsWith('script-src'));
    expect(scripts).toContain("'nonce-development-request-nonce'");
    expect(scripts).toContain("'unsafe-eval'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(policy).toContain("connect-src 'self' http://localhost:3001 ws: wss:");
    expect(policy).not.toContain('upgrade-insecure-requests');
  });
});
