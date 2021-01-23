import { UserSchema } from '@app/data/user/mongo/User.schema';
import { Document, Model, model } from 'mongoose';

export interface IUserModel extends Document {
	notificationId: string;
	displayName: string;
	fullName: string;
}

export const UserModel: Model<IUserModel> = model<IUserModel>(
	'users',
	UserSchema,
);
