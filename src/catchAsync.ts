import { Request, Response, NextFunction } from 'express';

import AppError from '~/error';

function catchAsync(
  fn: (_req: Request, _res: Response, _next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch((error: AppError) => next(error));
}

export default catchAsync;
