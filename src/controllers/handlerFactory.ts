import { NextFunction, Request, Response } from 'express';
import { Model, PopulateOptions } from 'mongoose';

import catchAsync from '~/catchAsync';
import AppError from '~/error';
import { APIFeatures } from '~/services/apiServices';

export const deleteOne = (model: Model<any>) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const document = await model.findByIdAndDelete(req.params.id);

    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

export const updateOne = (model: Model<any>) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const document = await model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: document,
      },
    });
  });

export const createOne = (model: Model<any>) =>
  catchAsync(async (req: Request, res: Response) => {
    const document = await model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: document,
      },
    });
  });

export const getOne = (model: Model<any>, popOptions?: PopulateOptions) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    let query = model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const document = await query;
    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: document,
      },
    });
  });

export const getAll = (model: Model<any>) =>
  catchAsync(async (req: Request, res: Response) => {
    /* the following two lines of code
    are applicable for getAllReviews only */
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    const api = new APIFeatures(model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const documents = await api.query;

    res.status(200).json({
      status: 'success',
      results: documents.length,
      data: {
        data: documents,
      },
    });
  });
