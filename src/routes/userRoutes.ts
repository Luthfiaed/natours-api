import express from 'express';

import {
  authorizeRouteTo,
  forgotPassword,
  logIn,
  protectRoute,
  resetPassword,
  signUp,
  updateMyPassword,
} from '~/controllers/authController';
import {
  deleteMyAccount,
  getAllUsers,
  getMyData,
  getUser,
  resizeUserPhoto,
  updateMyData,
  uploadUserPhoto,
} from '~/controllers/userController';

const userRouter = express.Router();

// UNPROTECTED
userRouter.post('/signup', signUp);
userRouter.post('/login', logIn);
userRouter.post('/forgotPassword', forgotPassword);
userRouter.post('/resetPassword/:token', resetPassword);

// PROTECTED
userRouter.use(protectRoute);

userRouter.get('/me', getMyData, getUser);
userRouter.patch('/updateMyPassword', updateMyPassword);
userRouter.patch(
  '/updateMyData',
  uploadUserPhoto,
  resizeUserPhoto,
  updateMyData,
);
userRouter.delete('/deleteMyAccount', deleteMyAccount);

// ADMIN ONLY
userRouter.use(authorizeRouteTo('admin'));

userRouter.route('/').get(getAllUsers).post();
userRouter.route('/:id').get(getUser).patch().delete();

export default userRouter;
