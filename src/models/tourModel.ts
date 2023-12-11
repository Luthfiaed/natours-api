import mongoose, { Document, Model, Query, Types } from 'mongoose';
import slugify from 'slugify';

import { IReview } from './reviewModel';
import { IUser } from './userModel';

enum TourDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  DIFFICULT = 'difficult',
}

export interface ITour extends Document {
  name: string;
  slug?: string;
  duration: number; // in days
  maxGroupSize: number;
  difficulty: TourDifficulty;
  ratingsAverage: number;
  ratingsQuantity: number;
  price: number;
  priceDiscount?: number;
  summary: string;
  description?: string;
  imageCover: string;
  images: Array<string>;
  createdAt?: Date;
  startDates?: Array<Date>;
  startLocation?: any;
  locations?: any; // TODO typing for geojson
  guides?: Array<Types.ObjectId> | Array<IUser>; // unpopulated | populated
}

interface TourBaseDocument extends ITour {
  // define virtuals and methods here
  durationWeeks: number;
  reviews: Array<Types.ObjectId> | Array<IReview>; // unpopulated | populated
}

interface TourModel extends Model<TourBaseDocument> {
  // define static methods here
}

const tourSchema = new mongoose.Schema<TourBaseDocument, TourModel>(
  {
    name: {
      type: String,
      required: [true, 'name is required property'],
      unique: true,
      trim: true,
      maxLength: [40, 'A tour name must have <= 40 characters'],
      minLength: [10, 'A tour name must have >= 10 characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'duration is required property'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'maxGroupSize is required property'],
    },
    difficulty: {
      type: String,
      required: [true, 'difficulty is required property'],
      enum: TourDifficulty,
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be >= 1.0'],
      max: [5, 'Rating must be <= 5.0'],
      set: (val: number) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'price is required property'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val: number) {
          return val < this.price;
        },
        message: 'Discount amount ({VALUE}) should be lower than price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'summary is required property'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'imageCover is required property'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    startDates: [Date],
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number], // lat, long
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  {
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  },
);

// INDEXES
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // 2D sphere index for points on a globe
tourSchema.index({ price: 1, ratingsAverage: -1 }); // compound index of price (ASC) and ratingsAverage (DESC)

// VIRTUAL PROPERTIES
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

/* the 'reviews' virtual property here is not applied by default.
You need to execute it with .populate() in the tour query of your choice */
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// DOCUMENT HOOK
tourSchema.pre<TourBaseDocument>('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// QUERY HOOK
tourSchema.pre<Query<TourBaseDocument, TourBaseDocument>>(
  /^find/,
  function (next) {
    this.populate({
      path: 'guides',
      select: '-__v -passwordChangedAt',
    });
    next();
  },
);

/* Below code is example if we want to implement embedding of guides data on tour schema
but we want to implement child referencing so we don't need it. */
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(
//     async (userId) => await User.findById(userId),
//   );
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

const Tour = mongoose.model<TourBaseDocument, TourModel>('Tour', tourSchema);

export default Tour;
