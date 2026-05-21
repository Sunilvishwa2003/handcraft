import { Request } from 'express';
import { IUser } from '../models/User';

export type AuthenticatedRequest = Request & {
  user?: IUser;
};
