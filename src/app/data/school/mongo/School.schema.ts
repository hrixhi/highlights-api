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
    },
    // In case we want to deploy admin on custom domains
    cuesDomain: {
        type: String,
        required: true,
    },
    // School Contact info
    email: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    website: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: false,
    },
    // OPTIONAL
    logo: {
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
    enableStandardsBasedGrading: {
        type: Boolean,
        required: false,
    },
    // NOT REQUIRED
    password: {
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
    // END OF NOT REQUIRED
});

export const schoolSchema = schema;
