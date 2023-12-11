import { Query } from 'mongoose';

type DurationOperator = 'gte' | 'lte' | 'ne' | 'gt' | 'lt';

interface RequestQuery {
  sort?: string;
  fields?: string;
  limit?: string;
  page?: string;
  duration?: Record<DurationOperator, string>;
}

export class APIFeatures {
  public query: Query<any, any>;
  public queryString: RequestQuery;

  constructor(query: Query<any, any>, queryString: RequestQuery) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = Object.assign({}, this.queryString);
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    let fields = '-__v'; // exclude __v field by default
    if (this.queryString.fields) {
      fields = fields.concat(' ', this.queryString.fields.split(',').join(' '));
    }
    this.query = this.query.select(fields);

    return this;
  }

  paginate() {
    const page = Number(this.queryString.page) * 1 || 1;
    const limit = Number(this.queryString.limit) * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
