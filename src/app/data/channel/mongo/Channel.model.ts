import { Document, Model, model } from 'mongoose';
import { channelSchema } from './Channel.schema';

export interface IChannelModel extends Document {
	createdBy: string;
	name: string;
	password?: string;
}

export const ChannelModel: Model<IChannelModel> = model<IChannelModel>(
	'channels',
	channelSchema,
);
