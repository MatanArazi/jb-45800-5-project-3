import type { Request, Response, NextFunction } from 'express';

export default function extractAuth(_req: Request, _res: Response, next: NextFunction) {
  next();
}
