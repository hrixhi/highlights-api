import { Schema, Types } from 'mongoose';

const schema = new Schema({
    title: {
        type: String,
        required: true,
    },
    totalPoints: {
        type: Number,
        required: true,
    },
    gradeWeight: {
        type: Number,
        required: true,
    },
    deadline: {
        type: Date,
        required: true,
    },
    channelId: {
        type: Types.ObjectId,
        requried: true,
    },
    releaseSubmission: {
        type: Boolean,
        required: false,
    },
});

export const GradebookEntrySchema = schema;
