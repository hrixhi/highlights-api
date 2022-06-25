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
    description?: string;
    accessCode?: string;
    isPublic?: boolean;
    tags?: string[];
    // ZOOM INSTANT MEETING
    // startUrl?: string;
    // joinUrl?: string;
    meetingOn?: boolean;
    // startedBy?: string;
    channelId?: string;
    schoolId?: string;
    sisId?: string;
    deletedAt?: Date;
    // FOR OTHER VIDEO CONFERENCING TOOLS
    meetingUrl?: string;
    term?: string;
    startDate?: string;
    endDate?: string;
    creditHours?: number;
    gradingScale?: string;
    standardsBasedGradingScale?: string;
}

export const ChannelModel: Model<IChannelModel> = model<IChannelModel>('channels', channelSchema);
