import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/confidentialite', '/mentions-legales', '/conditions'].map((path) => ({
    url: `https://www.alcideai.fr${path}`,
  }));
}
