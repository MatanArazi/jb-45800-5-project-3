import { Router, RequestHandler } from 'express';

interface ReportsHandlers {
  getVacationLikesReport: RequestHandler;
  getVacationLikesCsv: RequestHandler;
}

export function createReportsRouter(handlers: ReportsHandlers): Router {
  const router = Router();

  router.get('/reports/vacation-likes', handlers.getVacationLikesReport);
  router.get('/reports/vacation-likes.csv', handlers.getVacationLikesCsv);

  return router;
}
