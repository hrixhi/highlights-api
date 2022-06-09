import { Schema, Types } from 'mongoose';

const schema = new Schema({
    userId: {
        type: Types.ObjectId,
        required: true,
    },
    subtitle: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        required: false,
    },
    channelId: {
        type: String,
        required: false,
    },
    date: {
        type: Date,
        required: true,
    },
    cueId: {
        type: String,
        required: false,
    },
    target: {
        type: String,
        required: false,
    },
    threadId: {
        type: String,
        required: false,
    },
    announcementId: {
        type: Types.ObjectId,
        required: false,
    },
});

export const activitySchema = schema;
