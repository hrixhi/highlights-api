import { Document, Model, model } from 'mongoose';
import { activitySchema } from './activity.schema';

export interface IActivityModel extends Document {
	userId: string;
	title: string;
	subtitle: string;
	status: string;
	date: Date;
	channelId: string;
	body?: string;
}

export const ActivityModel: Model<IActivityModel> = model<IActivityModel>(
	'activity',
	activitySchema,
);
