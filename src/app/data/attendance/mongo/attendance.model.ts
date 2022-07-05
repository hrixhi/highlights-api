import { Document, Model, model } from 'mongoose';
import { attendanceSchema } from './attendance.schema';

export interface IAttendanceModel extends Document {
    userId: string;
    channelId: string;
    dateId?: string;
    attendanceEntryId?: string;
    joinedAt?: Date;
    leftAt?: Date;
    attendanceType?: string;
    //
    excused?: boolean;
    late?: boolean;
}

export const AttendanceModel: Model<IAttendanceModel> = model<IAttendanceModel>('attendances', attendanceSchema);
