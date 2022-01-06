import { Schema, Types } from 'mongoose';

const workosConnectionSchema = new Schema({
    id: {
        type: String,
        required: true
    },
    connection_type: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    }
});

const schema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    logo: {
        type: String,
        required: false
    },
    allowStudentChannelCreation: {
        type: Boolean,
        required: false
    },
    recoveryEmail: {
        type: String,
        required: false
    },
    streamId: {
        type: String,
        required: false
    },
    workosOrgId: {
        type: String,
        required: false
    },
    ssoEnabled: {
        type: Boolean,
        required: false
    },
    ssoDomain: {
        type: String,
        required: false,
        unique: true
    },
    cuesDomain: {
        type: String,
        required: false,
        unique: true
    },
    workosConnection: {
        type: workosConnectionSchema,
        required: false
    }
});

export const schoolSchema = schema;
