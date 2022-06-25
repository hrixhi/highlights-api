import { Schema, Types } from 'mongoose';
import { SchemaTimestamps } from '@service/MongoDB/modules/Timestamps';

const schema = new Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: false,
        },
        category: {
            type: String,
            required: false,
        },
        channelId: {
            type: Types.ObjectId,
            required: false,
        },
    },
    SchemaTimestamps
);

export const standardsSchema = schema;
