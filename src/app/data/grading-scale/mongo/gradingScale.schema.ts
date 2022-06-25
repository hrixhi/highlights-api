import { Schema, Types } from 'mongoose';

const scaleRangeSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    start: {
        type: Number,
        required: false,
    },
    end: {
        type: Number,
        required: false,
    },
    points: {
        type: Number,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
});

const schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    range: {
        type: [scaleRangeSchema],
        required: true,
    },
    passFailMinimum: {
        type: Number,
        required: false,
    },
    default: {
        type: Boolean,
        required: false,
    },
    schoolId: {
        type: Types.ObjectId,
        required: false,
    },
    // Standards based grading
    standardsBasedScale: {
        type: Boolean,
        required: false,
    },
    standardsGradeMode: {
        type: String,
        required: false,
        enum: ['mean', 'mode', 'highest', 'mostRecent', 'decayingAverage'],
    },
});

export const gradingScaleSchema = schema;
