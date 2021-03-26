import { Document, Model, model } from 'mongoose';
import { messageStatusSchema } from './message-status.schema';

export interface IMessageStatusModel extends Document {
	userId: string;
	groupId: string;
	channelId: any;
}

export const MessageStatusModel: Model<IMessageStatusModel> = model<IMessageStatusModel>(
	'message-statuses',
	messageStatusSchema,
);
