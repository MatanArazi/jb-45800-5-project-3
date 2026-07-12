import { Router, RequestHandler } from 'express';

interface LikesRouterHandlers {
  addLike: RequestHandler;
  removeLike: RequestHandler;
  getUserLikes: RequestHandler;
}

export function createLikesRouter(handlers: LikesRouterHandlers, rejectAdminLike: RequestHandler): Router {
  const router = Router();

  router.post('/likes', rejectAdminLike, handlers.addLike);
  router.delete('/likes/:user_id/:vacation_id', rejectAdminLike, handlers.removeLike);
  router.get('/users/:user_id/likes', handlers.getUserLikes);

  return router;
}
