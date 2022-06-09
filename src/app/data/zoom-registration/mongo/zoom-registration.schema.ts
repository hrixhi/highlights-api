import { Schema, Types } from 'mongoose';

const schema = new Schema({
    zoomRegistrationId: {
        type: String,
        required: true,
    },
    zoomMeetingId: {
        type: String,
        required: true,
    },
    userId: {
        type: Types.ObjectId,
        required: true,
    },
    channelId: {
        type: Types.ObjectId,
        required: true,
    },
    zoom_join_url: {
        type: String,
        required: true,
    },
    registrant_id: {
        type: String,
        required: true,
    },
});

export const zoomRegistrationSchema = schema;
