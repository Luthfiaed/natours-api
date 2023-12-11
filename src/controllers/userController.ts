import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';

import catchAsync from '~/catchAsync';
import AppError from '~/error';
import User from '~/models/userModel';

import { deleteOne, getAll, getOne, updateOne } from './handlerFactory';

const filterObj = (object: object, ...includedFields: string[]): any => {
  const newObject = {};
  Object.keys(object).forEach((el) => {
    if (includedFields.includes(el)) newObject[el] = object[el];
  });
  return newObject;
};

export const getAllUsers = getAll(User);
export const getUser = getOne(User);
export const deleteMyAccount = deleteOne(User); // TODO can only delete their own account

/* Update user for fields EXCEPT password 
(because need pre-save hook for password, which is unavailable except in .save and .create) */
export const updateUser = updateOne(User);

export const getMyData = (req: Request, _res: Response, next: NextFunction) => {
  req.params.id = req.user._id as string;
  next();
};

export const updateMyData = catchAsync(async (req: Request, res: Response) => {
  const newData = filterObj(req.body, 'name', 'email');

  if (req.file) newData.photo = req.file.filename;

  const updatedUser = await User.findById(req.user._id, newData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// UPLOAD IMAGE
// Use memory storage because image will be manipulated first
const multerStorage = multer.memoryStorage();

const multerFilter = (_req, file, callback) => {
  if (file.mimetype.startsWith('image')) {
    callback(null, true);
  } else {
    callback(
      new AppError('Not an image. Please upload only image file', 400),
      false,
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

export const uploadUserPhoto = upload.single('photo');

export const resizeUserPhoto = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.file) return next();

    const filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/users/${filename}`);

    next();
  },
);

/* Example code if we want to use disk storage */
// const multerStorage = multer.diskStorage({
//   destination: (_req, _file, callback) => {
//     callback(null, 'public/img/users');
//   },
//   filename: (req, file, callback) => {
//     const fileExt = file.mimetype.split('/')[1];
//     callback(null, `user-${req.user.id}-${Date.now()}.${fileExt}`);
//   },
// });
