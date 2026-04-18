import { handle } from '@hono/node-server/vercel';
import { app } from '../src/app.js';

// Vercel Node.js serverless entry point
// @hono/node-server/vercel gère le format legacy (req: IncomingMessage, res: ServerResponse)
// contrairement à hono/vercel qui attend le format Web API (Request/Response Edge-only)
export default handle(app);
