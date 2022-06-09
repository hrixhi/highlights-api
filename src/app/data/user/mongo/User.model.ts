import { UserSchema } from '@app/data/user/mongo/User.schema';
import { Document, Model, model } from 'mongoose';

export interface IUserModel extends Document {
    notificationId: string;
    displayName: string;
    fullName: string;
    email?: string;
    avatar?: string;
    password?: string;
    schoolId?: string;
    role?: string;
    grade?: string;
    section?: string;
    deletedAt?: Date;
    inactive?: boolean;
    lastLoginAt?: Date;
    zoomInfo?: any;
    authProvider?: string;
    sisId?: string;
    createdAt: string;
    personalInfo?: any;
    parent1?: any;
    parent2?: any;
    adminInfo?: any;
}

export const UserModel: Model<IUserModel> = model<IUserModel>('users', UserSchema);
