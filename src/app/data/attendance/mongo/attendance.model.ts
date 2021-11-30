import { Document, Model, model } from 'mongoose';
import { attendanceSchema } from './attendance.schema';

export interface IAttendanceModel extends Document {
    userId: string;
    dateId: string;
    channelId: string;
    joinedAt?: Date;
    leftAt?: Date;
}

export const AttendanceModel: Model<IAttendanceModel> = model<IAttendanceModel>('attendances', attendanceSchema);
