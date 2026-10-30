import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
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
