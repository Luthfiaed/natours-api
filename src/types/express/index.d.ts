import { IUser } from '~/models/userModel';

import { IFile } from './files';

declare module 'express-serve-static-core' {
  export interface Request {
    user?: IUser;
    files?: IFile;
  }
}

// declare global {
//   namespace Express {
//     export interface Request {
//       user?: IUser
//       files?: IFile
//     }
//   }
// }
