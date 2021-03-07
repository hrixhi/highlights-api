import { Document, Model, model } from 'mongoose';
import { messageSchema } from './Message.schema';

export interface IMessageModel extends Document {
	groupId: string;
	sentBy: string;
	message: string;
	sentAt: Date;
}

export const MessageModel: Model<IMessageModel> = model<IMessageModel>(
	'messages',
	messageSchema,
);
