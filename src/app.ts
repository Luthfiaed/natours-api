import compression from 'compression';
import express, { NextFunction, Request, Response } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import xss from 'xss-clean';

import errorHandler from '~/controllers/errorController';
import reviewRouter from '~/routes/reviewRoutes';
import tourRouter from '~/routes/tourRoutes';
import userRouter from '~/routes/userRoutes';

import AppError from './error';

const app = express();

app.use(morgan('dev'));

// Set rate limit
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP. Please try again in an hour.',
});
app.use('/api', limiter);

app.use(helmet());

// Body parser, limit request body size
app.use(
  express.json({
    limit: '10kb',
  }),
);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    // whitelist is a list parameters that can be repeated in the query param
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// Serve static content
app.use(express.static(`${__dirname}/public`));

app.use(compression());

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server`, 404);
  next(err);
});

// error handling middleware
app.use(errorHandler);

export default app;
