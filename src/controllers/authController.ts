import crypto from 'crypto';
import { promisify } from 'util';

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import catchAsync from '~/catchAsync';
import AppError from '~/error';
import User, { IUser } from '~/models/userModel';
import { sendEmail } from '~/services/emailService';

const signToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

const createSendToken = (user: IUser, statusCode: number, res: Response) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + Number(process.env.JWT_COOKIE_EXPIRES_IN) * 60 * 60 * 1000,
    ),
    secure: false,
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

export const signUp = catchAsync(async (req: Request, res: Response) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createSendToken(newUser, 201, res);
});

export const logIn = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.checkPassword(password, user.password as string)) {
      return next(new AppError('incorrect email or password', 401));
    }

    createSendToken(user, 200, res);
  },
);

export const protectRoute = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in again', 401),
      );
    }

    /* promisify to stay consistent with our async/await pattern 
    and not block other operations */
    const decodedToken = await promisify(jwt.verify)(
      token,
      process.env.JWT_SECRET,
    );

    // check if user still exists
    const currentUser = await User.findById(decodedToken.id);
    if (!currentUser) {
      return next(
        new AppError(
          'Invalid user data. Please log in with different credential',
          401,
        ),
      );
    }

    // check if user changed pass after JWT (JWT age is 3 hours)
    if (currentUser.checkIsPasswordChangedAfterJwt(decodedToken.iat))
      return next(
        new AppError(
          'User recently changed password. Please log in with new credential',
          401,
        ),
      );

    req.user = currentUser;
    next();
  },
);

export const authorizeRouteTo = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role as string)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }

    next();
  };
};

export const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    const resetToken = user.createPasswordResetToken();
    /* the method createPasswordResetToken didn't actually save the data to the DB,
    only to this document so we still need to save it */
    await user.save({ validateBeforeSave: false }); // because some required fields are missing as we're only modifying the reset token

    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;

    const message = `Enter your new password to ${resetURL} 10 minutes. If you didn't forget your password, please ignore this message.`;

    try {
      await sendEmail({
        email: user.email as string,
        subject: 'Your Natours password reset token',
        message,
      });

      res.status(200).json({
        status: 'success',
        message: 'Token sent to email',
      });
    } catch (error) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(
        new AppError(
          'There was an error sending the mail. Try again later.',
          500,
        ),
      );
    }
  },
);

export const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(
        new AppError('Reset password token is invalid or expired', 400),
      );
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    createSendToken(user, 200, res);
  },
);

export const updateMyPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user._id).select('+password');

    if (
      !user.checkPassword(req.body.currentPassword, user.password as string)
    ) {
      return next(
        new AppError('Wrong password. Update password request denied.', 400),
      );
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    createSendToken(user, 200, res);
  },
);
