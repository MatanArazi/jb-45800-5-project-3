import { Router, RequestHandler } from 'express';

export function createStatsRouter(getStats: RequestHandler): Router {
  const router = Router();
  router.get('/stats', getStats);
  return router;
}
