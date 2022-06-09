import { Schema, Types } from 'mongoose';

const workosConnectionSchema = new Schema({
    id: {
        type: String,
        required: true,
    },
    connection_type: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
});

const schema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: false,
    },
    phoneNumber: {
        type: String,
        required: false,
    },
    website: {
        type: String,
        required: false,
    },
    cuesDomain: {
        type: String,
        required: true,
        unique: true,
    },
    logo: {
        type: String,
        required: false,
    },
    allowStudentChannelCreation: {
        type: Boolean,
        required: false,
    },
    recoveryEmail: {
        type: String,
        required: false,
    },
    streamId: {
        type: String,
        required: false,
    },
    workosOrgId: {
        type: String,
        required: false,
    },
    ssoEnabled: {
        type: Boolean,
        required: false,
    },
    ssoDomain: {
        type: String,
        required: false,
    },
    workosConnection: {
        type: workosConnectionSchema,
        required: false,
    },
    meetingProvider: {
        type: String,
        required: false,
    },
    // USED IF INSTRUCTOR DIRECTLY CREATES A CUES ACCOUNT AND DOESN'T WANT TO USE ADMIN
    createdByUser: {
        type: Types.ObjectId,
        required: false,
    },
    stripeAccountId: {
        type: String,
        required: false,
    },
});

export const schoolSchema = schema;
