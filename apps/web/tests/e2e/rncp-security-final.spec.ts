import { expect, test } from '@playwright/test';

const xssPayload = '<img src=x onerror="document.body.dataset.rncpXss=executed">';
const forbiddenClientMarkers = [
  'OPENAI_API_KEY',
  'SERVICE_SECRET',
  'AUTH_SECRET',
  'AUTH_GOOGLE_SECRET',
  'test-service-secret-for-playwright',
  'test-google-client-secret',
  'test-auth-secret-for-playwright-32chars',
];

test.describe('RNCP final browser security recipes', () => {
  test('CR-043 does not execute or reflect an XSS payload from the URL', async ({ page }) => {
    await page.goto(`/?rncp=${encodeURIComponent(xssPayload)}`);

    // OWASP: A03 — an untrusted URL value must never become executable DOM.
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    await expect(page.locator('script', { hasText: 'rncpXss' })).toHaveCount(0);
    expect(await page.evaluate(() => document.body.dataset['rncpXss'])).toBeUndefined();
    expect(await page.content()).not.toContain(xssPayload);
  });

  test('CR-045 keeps server secrets out of HTML and downloaded JavaScript', async ({ page }) => {
    const browserResourceReads: Array<Promise<string>> = [];

    page.on('response', (response) => {
      const resourceType = response.request().resourceType();
      if (resourceType !== 'document' && resourceType !== 'script') return;

      browserResourceReads.push(
        response.text().catch(() => {
          // A navigation may dispose a response; all other completed resources remain checked.
          return '';
        }),
      );
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const browserResources = await Promise.all(browserResourceReads);
    const browserSurface = [await page.content(), ...browserResources].join('\n');

    // OWASP: A02 — only NEXT_PUBLIC_* configuration may be bundled for the browser.
    for (const marker of forbiddenClientMarkers) {
      expect(browserSurface, `${marker} must remain server-side`).not.toContain(marker);
    }
    expect(browserSurface).not.toMatch(/sk-[A-Za-z0-9_-]{20,}/);
  });

  test('CR-047 returns the expected CSP and browser hardening headers', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    if (!response) return;

    const headers = response.headers();
    const csp = headers['content-security-policy'] ?? '';

    // OWASP: A05 — verify effective response headers, not only configuration source code.
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
  });
});
