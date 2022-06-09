import { Schema, Types } from 'mongoose';

const schema = new Schema({
    createdBy: {
        type: Types.ObjectId,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: false,
    },
    meetingOn: {
        type: Boolean,
        required: false,
    },
    creatorUnsubscribed: {
        type: Boolean,
        required: false,
    },
    temporary: {
        type: Boolean,
        required: false,
    },
    owners: {
        type: [String],
        required: false,
    },
    colorCode: {
        type: String,
        required: false,
    },
    isPublic: {
        type: Boolean,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    tags: {
        type: [String],
        required: false,
    },
    accessCode: {
        type: String,
        required: false,
    },
    schoolId: {
        type: Types.ObjectId,
        required: false,
    },
    sisId: {
        type: String,
        required: false,
    },
    deletedAt: {
        type: Date,
        required: false,
    },
    meetingUrl: {
        type: String,
        required: false,
    },
    term: {
        type: Types.ObjectId,
        required: false,
    },
    startDate: {
        type: Date,
        required: false,
    },
    endDate: {
        type: Date,
        required: false,
    },
});

export const channelSchema = schema;
