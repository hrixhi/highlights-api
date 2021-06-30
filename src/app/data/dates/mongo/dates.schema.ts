import { Schema, Types } from "mongoose";

const schema = new Schema({
    userId: {
        type: Types.ObjectId,
        required: false
    },
    title: {
        type: String,
        required: false
    },
    start: {
        type: Date,
        required: true
    },
    end: {
        type: Date,
        required: true
    },
    scheduledMeetingForChannelId: {
        type: Types.ObjectId,
        required: false
    },
    isNonMeetingChannelEvent: {
        type: Boolean,
        required: false
    },
    // New Features
    description: {
        type: String,
        required: false
    },
    recordMeeting: {
        type: Boolean,
        required: true
    },
    recordingLink: {
        type: String,
        required: false
    },
    recurringId: {
        type: String,
        required: false
    }
});

export const dateSchema = schema;
