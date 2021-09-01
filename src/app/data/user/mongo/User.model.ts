import { UserSchema } from '@app/data/user/mongo/User.schema';
import { Document, Model, model } from 'mongoose';

export interface IUserModel extends Document {
	notificationId: string;
	displayName: string;
	fullName: string;
	email?: string;
	avatar?: string;
	password?: string;
	randomShuffleFrequency?: string;
	sleepFrom?: string;
	sleepTo?: string;
	currentDraft?: string;
	schoolId?: string;
	role?: string;
	grade?: string;
	section?: string;
	deletedAt?: Date;
	inactive?: boolean;
	lastLoginAt?: Date;
}

export const UserModel: Model<IUserModel> = model<IUserModel>(
	'users',
	UserSchema,
);
