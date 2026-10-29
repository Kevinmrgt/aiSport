// @ts-check


/** @type {import('next').NextConfig} */
const nextConfig = {
  // OWASP A05: Content Security Policy et headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // CSP with a fresh script nonce is supplied by middleware.\r\n          // OWASP A05: headers de sécurité additionnels
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
