// @ts-check

const isDevelopment = process.env.NODE_ENV !== 'production';
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
              `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              `connect-src 'self' ${apiUrl}`,
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
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
  transpilePackages: ['@alcide/shared'],
  // Output standalone pour le déploiement Docker uniquement (incompatible Vercel)
  ...(process.env.BUILD_STANDALONE === 'true' && { output: 'standalone' }),
};

export default nextConfig;
