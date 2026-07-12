import { Router, RequestHandler } from 'express';
import multer from 'multer';

interface VacationsHandlers {
  listVacations: RequestHandler;
  getVacationById: RequestHandler;
  createVacation: RequestHandler;
  updateVacation: RequestHandler;
  deleteVacation: RequestHandler;
}

export function createVacationsRouter(
  handlers: VacationsHandlers,
  adminOnly: RequestHandler,
  upload: multer.Multer,
): Router {
  const router = Router();

  router.get('/vacations', handlers.listVacations);
  router.get('/vacations/:id', handlers.getVacationById);
  router.post('/vacations', adminOnly, upload.single('image'), handlers.createVacation);
  router.put('/vacations/:id', adminOnly, upload.single('image'), handlers.updateVacation);
  router.delete('/vacations/:id', adminOnly, handlers.deleteVacation);

  return router;
}
