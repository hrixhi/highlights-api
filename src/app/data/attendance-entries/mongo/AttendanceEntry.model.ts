import { AttendanceEntrySchema } from './AttendanceEntry.schema';
import { Document, Model, model } from 'mongoose';

export interface IAttendanceEntryModel extends Document {
    title: string;
    date: Date;
    channelId: string;
    recordingLink?: string;
}

export const AttendanceEntryModel: Model<IAttendanceEntryModel> = model<IAttendanceEntryModel>(
    'attendance-entries',
    AttendanceEntrySchema
);
