import { Schema, Types } from 'mongoose';

const schema = new Schema({
    userId: {
        type: Types.ObjectId,
        required: true
    },
    dateId: {
        type: Types.ObjectId,
        required: true
    },
    channelId: {
        type: Types.ObjectId,
        required: true
    },
    // First timestamp
    joinedAt: {
        type: Date,
        required: false
    },
    // Last timestamp
    leftAt: {
        type: Date,
        required: false
    }
});

export const attendanceSchema = schema;
