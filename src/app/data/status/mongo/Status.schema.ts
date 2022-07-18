import { Schema, Types } from 'mongoose';

const schema = new Schema({
    userId: {
        type: Types.ObjectId,
        required: true,
    },
    cueId: {
        type: Types.ObjectId,
        required: true,
    },
    channelId: {
        type: Types.ObjectId,
        required: true,
    },
    // SUBMITTED AND GRADED HANDLED AT QUERY TIME
    status: {
        type: String,
        required: true,
        enum: ['delivered', 'not-delivered', 'read'],
    },
});

export const statusSchema = schema;
