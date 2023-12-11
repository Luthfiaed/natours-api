import { model, Document, Model, Types, Schema, Query } from 'mongoose';

import Tour from './tourModel';

export interface IReview extends Document {
  review: string;
  rating: number;
  createdAt?: Date;
  tour: Types.ObjectId;
  author: Types.ObjectId;
}

interface ReviewBaseDocument extends IReview {
  // define virtuals and methods here
}

interface ReviewModel extends Model<IReview> {
  // define static methods here
  // eslint-disable-next-line no-unused-vars
  calculateTourAvgRating(tourId: Types.ObjectId): void;
}

const reviewSchema = new Schema<ReviewBaseDocument, ReviewModel>(
  {
    review: {
      type: String,
      trim: true,
      required: [true, 'Review is a required property'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is a required property'],
      min: [1.0, 'Rating must be between 1 and 5'],
      max: [5.0, 'Rating must be between 1 and 5'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: Schema.Types.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must refer to a tour'],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must refer to a user (author)'],
    },
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

reviewSchema.statics.calculateTourAvgRating = async function (
  tourId: Types.ObjectId,
) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        avgRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].ratingCount,
    });
  } else {
    // Default value when there is no review
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 0,
      ratingsQuantity: 0,
    });
  }
};

// combination of user AND tour have to be unique == for each tour, one user can only write one review
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.post<ReviewBaseDocument>('save', function () {
  /* 'this' refers to the document and this.constructor refers to the model.
  Typecasting the model to IReviewModel to make its static method(s) visible to TypeScript */
  const reviewModel = this.constructor as ReviewModel;
  reviewModel.calculateTourAvgRating(this.tour);
});

/* findByIdAndUpdate and findByIdAndDelete use findOneAnd underneath */
reviewSchema.pre<Query<ReviewBaseDocument, ReviewBaseDocument>>(
  /^findOneAnd/,
  async function (this: any, next) {
    /* Since this is a query hook, 'this' refers to the query and not the document.
    We need to execute the query first with .findOne() to access the document */

    /* Typecast 'this' to type 'any' so we can pass a custom property 
    to the post middleware below */
    this.updatedTour = await this.model.findOne(this.getQuery());
    next();
  },
);

reviewSchema.post<Query<ReviewBaseDocument, ReviewBaseDocument>>(
  /^findOneAnd/,
  // eslint-disable-next-line no-unused-vars
  async function (this: any) {
    /* To call calculateTourAvgRating, we must have access to the Review model.
    We access the model from the constructor of the document we passed in the custom 
    property 'updatedTour' */
    await this.updatedTour.constructor.calculateTourAvgRating(
      this.updatedTour.tour,
    );
  },
);

const Review = model<IReview, ReviewModel>('Review', reviewSchema);

export default Review;
