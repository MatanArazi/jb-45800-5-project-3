import { Router, RequestHandler } from 'express';

export function createReviewsRouter(addReview: RequestHandler): Router {
  const router = Router();
  router.post('/reviews', addReview);
  return router;
}
