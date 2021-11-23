import { Document, Model, model } from 'mongoose';
import { channelSchema } from './Channel.schema';

export interface IChannelModel extends Document {
	createdBy: string;
	name: string;
	password?: string;
	// Creator left the channel
	creatorUnsubscribed?: boolean;
	temporary?: boolean;
	// Moderators
	owners?: string[];
	colorCode?: string;
	startUrl?: string;
	joinUrl?: string;
	meetingOn?: boolean;
	startedBy?: string;
	description?: string;
	accessCode?: string;
	isPublic?: boolean;
	tags?: string[];
}

export const ChannelModel: Model<IChannelModel> = model<IChannelModel>(
	'channels',
	channelSchema,
);
