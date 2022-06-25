import { Schema, Types } from 'mongoose';
import { SchemaTimestamps } from '@service/MongoDB/modules/Timestamps';

const schema = new Schema(
    {
        standardId: {
            type: Types.ObjectId,
            required: true,
        },
        userId: {
            type: Types.ObjectId,
            required: true,
        },
        points: {
            type: Number,
            required: true,
        },
        overridden: {
            type: Boolean,
            required: false,
        },
    },
    SchemaTimestamps
);

export const standardsScoresSchema = schema;
