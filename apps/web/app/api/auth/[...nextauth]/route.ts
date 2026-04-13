import { handlers } from '@/lib/auth';

// Route handler Auth.js pour les callbacks OAuth (OWASP A07)
export const { GET, POST } = handlers;
