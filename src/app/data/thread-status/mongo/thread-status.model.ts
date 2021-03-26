import { Document, Model, model } from 'mongoose';
import { threadStatusSchema } from './thread-status.schema';

export interface IThreadStatusModel extends Document {
	threadId: any;
	userId: any;
	channelId: string;
	cueId?: string;
}

export const ThreadStatusModel: Model<IThreadStatusModel> = model<IThreadStatusModel>(
	'thread-statuses',
	threadStatusSchema,
);
