import { handle } from 'hono/vercel';
import { app } from '../src/app.js';

// Vercel Node.js serverless entry point
// Toutes les routes Hono sont exposées via cette fonction serverless
export const config = {
  runtime: 'nodejs20.x',
};

export default handle(app);
