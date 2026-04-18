import { handle } from 'hono/vercel';
import { app } from '../src/app.js';

// Vercel Node.js serverless entry point (Web API format)
// runtime: 'nodejs20.x' indique à Vercel d'utiliser le format Request/Response
// standard plutôt que le format legacy (req: VercelRequest, res: VercelResponse)
export const config = {
  runtime: 'nodejs20.x',
};

export default handle(app);
