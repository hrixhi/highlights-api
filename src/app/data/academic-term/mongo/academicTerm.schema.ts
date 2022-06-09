import { Schema, Types } from 'mongoose';

const schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
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

export const academicTermSchema = schema;
