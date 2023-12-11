import crypto from 'crypto';

import bcrypt from 'bcryptjs';
import mongoose, { Document, Model, Query } from 'mongoose';
import validator from 'validator';

export interface IUser extends Document {
  name: string;
  email: string;
  photo: string;
  role: string;
  password: string;
  passwordConfirm: string;
  activeUser: boolean;
  passwordChangedAt?: EpochTimeStamp;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

interface UserBaseDocument extends IUser {
  // define virtuals and methods here
  // eslint-disable-next-line no-unused-vars
  checkPassword(inputPassword: string, storedPassword: string): boolean;
  // eslint-disable-next-line no-unused-vars
  checkIsPasswordChangedAfterJwt(jwtExp: EpochTimeStamp): boolean;
  createPasswordResetToken(): string;
}

interface UserModel extends Model<UserBaseDocument> {
  // define static methods here
}

const userSchema = new mongoose.Schema<UserBaseDocument, UserModel>({
  name: {
    type: String,
    required: [true, 'name is required property'],
    unique: true,
    trim: true,
    maxLength: [40, 'Name must have <= 40 characters'],
  },
  email: {
    type: String,
    required: [true, 'email is required property'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: [validator.isEmail, 'Invalid email'],
  },
  photo: {
    type: String,
    trim: true,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  // TO DO: OAUTH TO 3RD PARTY
  password: {
    type: String,
    required: [true, 'password is required property'],
    minlength: [8, 'Password needs to be at least 8 characters'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'passwordConfirm is required property'],
    validate: {
      /* This validate property only works on save or create operation.
      That is why we use save instead of findByXAndUpdate on some updates */
      validator: function (val: string) {
        return val === this.password;
      },
      message: "confirm password doesn't match",
    },
    select: false,
  },
  passwordChangedAt: Number,
  passwordResetToken: String,
  passwordResetExpires: Date,
  activeUser: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre<UserBaseDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre<UserBaseDocument>('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  /* Minus 1 second because saving to DB might take longer than creating the JWT. 
  This is to offset that difference. A bit wacky hack I know */
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre<Query<UserBaseDocument, UserBaseDocument>>(
  /^find/,
  function (next) {
    this.find({ active: { $ne: false } });
    next();
  },
);

userSchema.methods.checkPassword = async function (
  inputPassword: string,
  storedPassword: string,
) {
  return await bcrypt.compare(inputPassword, storedPassword);
};

userSchema.methods.checkIsPasswordChangedAfterJwt = function (
  jwtExp: EpochTimeStamp,
) {
  if (this.passwordChangedAt) {
    const parsedChangeDate = parseInt(
      String(this.passwordChangedAt / 1000),
      10,
    );
    return jwtExp < parsedChangeDate;
  }
  return false; // User never changed password before
};

const TEN_MINUTES_IN_MS = 10 * 60 * 1000;

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(24).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + TEN_MINUTES_IN_MS;
  return resetToken;
};

const User = mongoose.model<UserBaseDocument, UserModel>('User', userSchema);

export default User;
