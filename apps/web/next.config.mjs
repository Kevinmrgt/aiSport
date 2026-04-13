// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // OWASP A05: Content Security Policy et headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // OWASP A08: Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval requis par Next.js dev
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' http://localhost:3001",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // OWASP A05: headers de sécurité additionnels
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  // Transpiler le package shared du monorepo
  transpilePackages: ['@sportcoach/shared'],
};

export default nextConfig;
