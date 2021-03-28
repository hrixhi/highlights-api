import { Document, Model, model } from 'mongoose';
import { groupSchema } from './Group.schema';

export interface IGroupsModel extends Document {
	users: string[];
	channelId?: string;
}

export const GroupModel: Model<IGroupsModel> = model<IGroupsModel>(
	'groups',
	groupSchema,
);
