import { Document, Model, model } from 'mongoose';
import { dateSchema } from './dates.schema';

export interface IDateModel extends Document {
    userId?: string;
    title?: string;
    start: Date;
    end: Date;
    scheduledMeetingForChannelId?: string;
    // Make sure this is undefined for meetings
    isNonMeetingChannelEvent?: boolean;
    // New fields
    description?: string;
    recordMeeting?: boolean;
    recordingLink?: string;
    recurringId?: string;
    // ZOOM
    zoomMeetingId?: string;
    zoomStartUrl?: string;
    zoomJoinUrl?: string;
    zoomMeetingScheduledBy?: string;
    // NON-ZOOM VIDEO TOOLS
    // meetingUrl?: string;
}

export const DateModel: Model<IDateModel> = model<IDateModel>('dates', dateSchema);
