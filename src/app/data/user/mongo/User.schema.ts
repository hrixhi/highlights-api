import { SchemaTimestamps } from '@service/MongoDB/modules/Timestamps';
import { Schema, Types } from 'mongoose';

const zoomSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    accountId: {
        type: String,
        required: true
    },
    accessToken: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String,
        required: true
    },
    expiresOn: {
        type: Date,
        required: true
    },
    accountType: {
        type: Number,
        required: false
    }
});

const schema = new Schema(
    {
        notificationId: {
            type: String,
            required: true
        },
        fullName: {
            type: String,
            required: true
        },
        displayName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: false
        },
        password: {
            type: String,
            required: false
        },
        sisId: {
            type: String,
            required: false
        },
        preferredName: {
            type: String,
            required: false
        },
        gradYear: {
            type: Number,
            required: false
        },
        sleepTo: {
            type: String,
            required: false
        },
        sleepFrom: {
            type: String,
            required: false
        },
        randomShuffleFrequency: {
            type: String,
            required: false
        },
        currentDraft: {
            type: String,
            required: false
        },
        schoolId: {
            type: Types.ObjectId,
            required: false
        },
        role: {
            type: String,
            required: false
        },
        grade: {
            type: String,
            required: false
        },
        section: {
            type: String,
            required: false
        },
        deletedAt: {
            type: Date,
            required: false
        },
        lastLoginAt: {
            type: Date,
            required: false
        },
        inactive: {
            type: Boolean,
            required: false
        },
        avatar: {
            type: String,
            required: false
        },
        zoomInfo: {
            type: zoomSchema,
            required: false
        },
        authProvider: {
            type: String,
            required: false
        }
    },
    SchemaTimestamps
);

export const UserSchema = schema;
