import { Schema, Types } from 'mongoose';

const schema = new Schema({
    userId: {
        type: Types.ObjectId,
        required: true,
    },
    // Date ID in case there is a Zoom meeting
    dateId: {
        type: Types.ObjectId,
        required: false,
    },
    channelId: {
        type: Types.ObjectId,
        required: true,
    },
    attendanceEntryId: {
        type: Types.ObjectId,
        required: false,
    },
    attendanceType: {
        type: String,
        required: false,
        enum: ['absent', 'present'],
        default: 'present',
    },
    excused: {
        type: Boolean,
        required: false,
    },
    late: {
        type: Boolean,
        required: false,
    },
    // First timestamp
    joinedAt: {
        type: Date,
        required: false,
    },
    // Last timestamp
    leftAt: {
        type: Date,
        required: false,
    },
});

export const attendanceSchema = schema;
