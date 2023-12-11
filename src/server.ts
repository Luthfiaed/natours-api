import { config } from 'dotenv';
import mongoose from 'mongoose';

import app from './app';

config({ path: './config.env' });

// uncaught exception global handler
// TODO: email to dev email
process.on('uncaughtException', (err: Error) => {
  console.log('Uncaught Exception: ', err.name, err.message);
  process.exit(1);
});

const DB = process.env.DATABASE_URL.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

console.log(DB);

mongoose
  .connect(DB, {})
  .then(() => {
    console.log('Connected to DB');
  })
  .catch((error) => console.log('Error connecting to DB: ', error));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Natours app running on port ${port}...`);
});

// unhandled rejection global handler
// TODO: email to dev email
process.on('unhandledRejection', (err: Error) => {
  console.log('Unhandled Rejection: ', err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
