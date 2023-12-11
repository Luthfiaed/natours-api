import { Request, Response } from 'express';
import { Error } from 'mongoose';

import AppError from '~/error';

const sendDevError = (err: AppError, res: Response) => {
  res.status(err.statusCode).json({
    error: err,
    status: err.status,
    message: err.message,
    stack: err.stack,
  });
};

const sendProdError = (err: AppError, res: Response) => {
  // operational error == "expected" error e.g. missing data, wrong data format, etc
  if (err.isOperationalError) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // unexpected bug, need to log for developers but users don't need to know
    // TODO use morgan to log these errors
    console.error('ERROR: ', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
};

const handleCastErrorDB = (err: Error.CastError) => {
  const message = `Invalid ${err.path} : ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err: any) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err: any) => {
  const errors = Object.values(err.errors).map(
    (current: any) => current.message,
  );
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJwtError = () => {
  return new AppError('Invalid token. Please log in again!', 401);
};

const handleTokenExpiredError = () => {
  return new AppError('Your token has expired! Please log in again.', 401);
};

const errorHandler = (err: any, _req: Request, res: Response) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'production') {
    let errCopy = { ...err };

    // TODO cek if theres a constant in Mongoose for CastError
    if (err.name === 'CastError') {
      errCopy = handleCastErrorDB(err as unknown as Error.CastError);
    }

    /* this error comes from mongodb driver instead of mongoose 
    hence the slightly different structure */
    if (err.code && err.code === 11000) {
      errCopy = handleDuplicateFieldsDB(err);
    }

    // validation error
    if (err.name === 'ValidationError') errCopy = handleValidationErrorDB(err);

    // JWT invalid error
    if (err.name === 'JsonWebTokenError') errCopy = handleJwtError();

    // JWT expired error
    if (err.name === 'TokenExpiredError') errCopy = handleTokenExpiredError();

    sendProdError(errCopy, res);
  } else {
    sendDevError(err, res);
  }
};

export default errorHandler;
