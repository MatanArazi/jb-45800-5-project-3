import { Router, RequestHandler } from 'express';

export function createAuthRouter(login: RequestHandler): Router {
  const router = Router();
  router.post('/auth/login', login);
  return router;
}
