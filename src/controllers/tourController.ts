import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';

import catchAsync from '~/catchAsync';
import AppError from '~/error';
import Tour from '~/models/tourModel';

import {
  createOne,
  deleteOne,
  getAll,
  getOne,
  updateOne,
} from './handlerFactory';

export const getAllTours = getAll(Tour);
export const getTour = getOne(Tour, { path: 'reviews' });
export const createTour = createOne(Tour);
export const updateTour = updateOne(Tour);
export const deleteTour = deleteOne(Tour);

export const aliasTopCheapTours = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';

  next();
};

export const checkBody = (req: Request, res: Response, next: NextFunction) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({
      status: 'fail',
      message: 'bad request',
    });
  }
  next();
};

export const getTourStats = catchAsync(async (_req: Request, res: Response) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: '$difficulty',
        num: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

export const getMonthlyPlan = catchAsync(
  async (req: Request, res: Response) => {
    const year = Number(req.params.year) * 1;
    const plan = await Tour.aggregate([
      {
        $unwind: '$startDates',
      },
      {
        $match: {
          startDates: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$startDates' },
          numTourStarts: { $sum: 1 },
          tours: { $push: '$name' },
        },
      },
      {
        $addFields: { month: '$_id' },
      },
      {
        $project: {
          _id: 0,
        },
      },
      {
        $sort: {
          numTourStarts: -1,
        },
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        plan,
      },
    });
  },
);

const EARTH_RADIUS_MI = 3963.2;
const EARTH_RADIUS_KM = 6378.1;

export const getToursWithin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { distance, latlng, unit } = req.params;

    const radius =
      unit === 'mi'
        ? Number(distance) / EARTH_RADIUS_MI
        : Number(distance) / EARTH_RADIUS_KM;

    const [lat, lng] = latlng.split(',');

    if (!lat || !lng) {
      return next(
        new AppError(
          'Please provide latitude and longitude in format lat,lng',
          400,
        ),
      );
    }

    const tours = await Tour.find({
      startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
    });

    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        data: tours,
      },
    });
  },
);

const METER_TO_MI = 0.000621371;
const METER_TO_KM = 0.001;

export const getTourDistances = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { latlng, unit } = req.params;

    const [lat, lng] = latlng.split(',');
    if (!lat || !lng) {
      return next(
        new AppError(
          'Please provide latitude and longitude in format lat,lng',
          400,
        ),
      );
    }

    const multiplier = unit === 'mi' ? METER_TO_MI : METER_TO_KM;

    const distances = await Tour.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)],
          },
          distanceField: 'distance',
          distanceMultiplier: multiplier,
          // TODO: CARI LIMIT DIGITS AFTER DECIMAL SEKARANG NOLNYA BANYAK BGT
        },
      },
      {
        $project: {
          name: 1,
          distance: 1,
        },
      },
    ]);

    res.status(200).json({
      status: 'success',
      results: distances.length,
      data: {
        data: distances,
      },
    });
  },
);

// IMAGE UPLOAD
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, callback) => {
  if (file.mimetype.startsWith('image')) {
    callback(null, true);
  } else {
    callback(
      new AppError('Not an image. Please upload only images.', 400),
      false,
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

export const uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

export const resizeTourImages = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.files.imageCover) {
      // PROCESS COVER IMAGE
      req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
      await sharp(req.files['imageCover'][0].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${req.body.imageCover}`);
    }

    if (req.files.images) {
      // PROCESS IMAGE
      req.body.images = [];
      await Promise.all(
        req.files['images'].map(async (file, i) => {
          const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

          await sharp(file.buffer)
            .resize(2000, 1333)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(`public/img/tours/${filename}`);

          req.body.images.push(filename);
        }),
      );
    }

    next();
  },
);
