import { SchemaTimestamps } from '@service/MongoDB/modules/Timestamps';
import { Schema, Types } from 'mongoose';

const zoomSchema = new Schema({
    email: {
        type: String,
        required: true,
    },
    accountId: {
        type: String,
        required: true,
    },
    accessToken: {
        type: String,
        required: true,
    },
    refreshToken: {
        type: String,
        required: true,
    },
    expiresOn: {
        type: Date,
        required: true,
    },
    accountType: {
        type: Number,
        required: false,
    },
});

const personalInformationSchema = new Schema(
    {
        dateOfBirth: {
            type: Date,
            required: false,
        },
        expectedGradYear: {
            type: Number,
            required: false,
        },
        phoneNumber: {
            type: String,
            required: false,
        },
        streetAddress: {
            type: String,
            required: false,
        },
        city: {
            type: String,
            required: false,
        },
        state: {
            type: String,
            required: false,
        },
        country: {
            type: String,
            required: false,
        },
        zip: {
            type: String,
            required: false,
        },
    },
    { _id: false }
);

const parentSchema = new Schema({
    _id: {
        type: Types.ObjectId,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
});

const adminUserSchema = new Schema(
    {
        role: {
            type: String,
            required: true,
            enum: ['owner', 'moderator', 'viewer'],
        },
        jobTitle: {
            type: String,
            required: false,
        },
        contactNumber: {
            type: String,
            required: false,
        },
    },
    { _id: false }
);

const schema = new Schema(
    {
        notificationId: {
            type: String,
            required: true,
        },
        // REQUIRED
        fullName: {
            type: String,
            required: true,
        },
        displayName: {
            type: String,
            required: false,
        },
        email: {
            type: String,
            required: false,
        },
        password: {
            type: String,
            required: false,
        },
        schoolId: {
            type: Types.ObjectId,
            required: false,
        },
        role: {
            type: String,
            required: false,
            enum: ['student', 'instructor', 'admin', 'parent'],
        },
        grade: {
            type: String,
            required: false,
        },
        section: {
            type: String,
            required: false,
        },
        avatar: {
            type: String,
            required: false,
        },
        sisId: {
            type: String,
            required: false,
        },
        // PERSONAL INFORMATION
        personalInfo: {
            type: personalInformationSchema,
            required: false,
        },
        // PARENT ACCESS
        parent1: {
            type: parentSchema,
            required: false,
        },
        parent2: {
            type: parentSchema,
            required: false,
        },
        // PARENT SCHOOL IDS FOR CHILDREN
        parentSchoolIds: {
            type: [Types.ObjectId],
            required: false,
        },
        // OTHER
        deletedAt: {
            type: Date,
            required: false,
        },
        lastLoginAt: {
            type: Date,
            required: false,
        },
        inactive: {
            type: Boolean,
            required: false,
        },
        zoomInfo: {
            type: zoomSchema,
            required: false,
        },
        authProvider: {
            type: String,
            required: false,
        },
        // Store ADMIN DATA along with other Users so that Messages + Announcements architecture is simpler, also an admin can be an instructor so need to have a single login for both
        adminInfo: {
            type: adminUserSchema,
            required: false,
        },
        // STREAM TOKEN
        streamToken: {
            type: String,
            required: false,
        },
        // DELETE
        randomShuffleFrequency: {
            type: String,
            required: false,
        },
        sleepFrom: {
            type: String,
            required: false,
        },
        sleepTo: {
            type: String,
            required: false,
        },
        currentDraft: {
            type: String,
            required: false,
        },
    },
    SchemaTimestamps
);

export const UserSchema = schema;
