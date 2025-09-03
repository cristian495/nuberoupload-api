import { Types } from 'mongoose';
import { User } from '../schemas/user.schema';

export interface AuthenticatedUser extends Omit<User, '_id'> {
  _id: Types.ObjectId;
}