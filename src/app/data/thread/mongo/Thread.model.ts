import { Document, Model, model } from 'mongoose';
import { threadSchema } from './Thread.schema';

export interface IThreadModel extends Document {
	message: string;
	userId: any;
	time: Date;
	channelId: any;
	isPrivate: boolean;
	anonymous: boolean;
	cueId?: any;
	category?: string;
	parentId?: any;
}

export const ThreadModel: Model<IThreadModel> = model<IThreadModel>(
	'threads',
	threadSchema,
);
