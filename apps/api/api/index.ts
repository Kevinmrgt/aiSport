import { handle } from 'hono/vercel';
import { app } from '../src/app.js';

// Vercel Node.js serverless entry point
// Toutes les routes Hono sont exposées via cette fonction serverless
// Note: pas de config.runtime — Vercel détecte automatiquement Node.js
export default handle(app);
