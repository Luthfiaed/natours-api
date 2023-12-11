import express from 'express';

import { authorizeRouteTo, protectRoute } from '~/controllers/authController';
import {
  aliasTopCheapTours,
  createTour,
  deleteTour,
  getAllTours,
  getMonthlyPlan,
  getTour,
  getTourDistances,
  getTourStats,
  getToursWithin,
  resizeTourImages,
  updateTour,
  uploadTourImages,
} from '~/controllers/tourController';

import reviewRouter from './reviewRoutes';

const tourRouter = express.Router();

// aliasing
tourRouter.route('/top-5-cheap-tours').get(aliasTopCheapTours, getAllTours);

tourRouter.route('/tour-stats').get(getTourStats);

tourRouter
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(getToursWithin);

// list of tours with their distance from :latlng
tourRouter.route('/distances/:latlng/unit/:unit').get(getTourDistances);

tourRouter
  .route('/')
  .get(getAllTours)
  .post(protectRoute, authorizeRouteTo('admin', 'lead-guide'), createTour);

tourRouter
  .route('/monthly-plan/:year')
  .get(
    protectRoute,
    authorizeRouteTo('admin', 'lead-guide', 'guide'),
    getMonthlyPlan,
  );

// merge tour router with review router for this specific path
tourRouter.use('/:tourId/reviews', reviewRouter);

tourRouter
  .route('/:id')
  .get(getTour)
  .patch(
    protectRoute,
    authorizeRouteTo('admin', 'lead-guide'),
    uploadTourImages,
    resizeTourImages,
    updateTour,
  )
  .delete(protectRoute, authorizeRouteTo('admin', 'lead-guide'), deleteTour);

export default tourRouter;
