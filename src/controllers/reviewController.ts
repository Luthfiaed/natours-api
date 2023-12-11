import { Request, Response, NextFunction } from 'express';

import Review from '~/models/reviewModel';

import {
  createOne,
  deleteOne,
  getAll,
  getOne,
  updateOne,
} from './handlerFactory';

export const getAllReviews = getAll(Review);
export const getReview = getOne(Review);
export const createReview = createOne(Review);
export const updateReview = updateOne(Review);
export const deleteReview = deleteOne(Review);

export const setTourUserIds = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.author = req.user._id;

  next();
};
