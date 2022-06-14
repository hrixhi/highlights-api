import { Schema, Types } from 'mongoose';

const schema = new Schema({
    gradebookEntryId: {
        type: Types.ObjectId,
        required: true,
    },
    channelId: {
        type: Types.ObjectId,
        required: true,
    },
    userId: {
        type: Types.ObjectId,
        required: true,
    },
    submitted: {
        type: Boolean,
        required: true,
    },
    points: {
        type: Number,
        required: false,
    },
    score: {
        type: Number,
        required: false,
    },
    lateSubmission: {
        type: Boolean,
        required: false,
    },
    submittedAt: {
        type: Date,
        required: false,
    },
    feedback: {
        type: String,
        required: false,
    },
});

export const GradebookScoreSchema = schema;
