import { Document, Model, model } from "mongoose";
import { dateSchema } from "./dates.schema";

export interface IDateModel extends Document {
    userId?: string;
    title?: string;
    start: Date;
    end: Date;
    scheduledMeetingForChannelId?: any;
    isNonMeetingChannelEvent?: boolean;
    // New fields
    description?: string;
    recordMeeting?: boolean;
    recordingLink?: string;
    recurringId?: string;
}

export const DateModel: Model<IDateModel> = model<IDateModel>("dates", dateSchema);
