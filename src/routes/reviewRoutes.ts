import express from 'express';

import { authorizeRouteTo, protectRoute } from '~/controllers/authController';
import {
  createReview,
  deleteReview,
  getAllReviews,
  getReview,
  setTourUserIds,
  updateReview,
} from '~/controllers/reviewController';

const reviewRouter = express.Router({ mergeParams: true });

reviewRouter.use(protectRoute);

reviewRouter
  .route('/')
  .get(getAllReviews)
  .post(authorizeRouteTo('user'), setTourUserIds, createReview);

reviewRouter
  .route('/:id')
  .get(getReview)
  .patch(authorizeRouteTo('user', 'admin'), updateReview)
  .delete(authorizeRouteTo('user', 'admin'), deleteReview);

export default reviewRouter;
