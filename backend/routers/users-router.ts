import { Router, RequestHandler } from 'express';

interface UsersHandlers {
  listUsers: RequestHandler;
  createUser: RequestHandler;
}

export function createUsersRouter(handlers: UsersHandlers): Router {
  const router = Router();
  router.get('/users', handlers.listUsers);
  router.post('/users', handlers.createUser);
  return router;
}
