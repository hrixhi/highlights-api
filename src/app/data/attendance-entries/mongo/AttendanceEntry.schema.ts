import { Schema, Types } from 'mongoose';

const schema = new Schema({
    title: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    channelId: {
        type: Types.ObjectId,
        requried: true,
    },
    recordingLink: {
        type: String,
        required: false,
    },
});

export const AttendanceEntrySchema = schema;
