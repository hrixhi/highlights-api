import { Document, Model, model } from 'mongoose';
import { groupSchema } from './Group.schema';

export interface IGroupsModel extends Document {
	users: string[];
}

export const GroupModel: Model<IGroupsModel> = model<IGroupsModel>(
	'groups',
	groupSchema,
);
