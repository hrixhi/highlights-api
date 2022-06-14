import { Schema, Types } from 'mongoose';

const scaleRangeSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    start: {
        type: Number,
        required: true,
    },
    end: {
        type: Number,
        required: true,
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
});

export const gradingScaleSchema = schema;
