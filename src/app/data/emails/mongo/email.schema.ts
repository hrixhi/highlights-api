import { Schema, Types } from 'mongoose';

const schema = new Schema({
    emailId: {
        type: String,
        required: true
    },
    unsubscribedAt: {
        type: Date,
        required: false
    }
})

export const emailSchema = schema