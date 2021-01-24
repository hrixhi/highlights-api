import { Document, Model, model } from 'mongoose';
import { statusSchema } from './Status.schema';

export interface IStatusModel extends Document {
	userId: any;
	channelId: any;
	cueId: any;
	status: string;
}

export const StatusModel: Model<IStatusModel> = model<IStatusModel>(
	'statuses',
	statusSchema,
);
