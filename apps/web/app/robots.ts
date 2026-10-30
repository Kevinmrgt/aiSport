import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin',
        '/change-password',
        '/compte-suspendu',
        '/abonnement',
        '/login',
        '/generate',
        '/dashboard',
        '/workouts',
        '/programs',
        '/settings',
      ],
    },
    sitemap: 'https://www.alcideai.fr/sitemap.xml',
  };
}
