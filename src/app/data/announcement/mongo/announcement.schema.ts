import { SchemaTimestamps } from '@service/MongoDB/modules/Timestamps';
import { Schema, Types } from 'mongoose';

const schema = new Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        userId: {
            type: Types.ObjectId,
            required: true,
        },
        schoolId: {
            type: Types.ObjectId,
            required: true,
        },
        // SCHOOL EVENT USERS
        selectedSegment: {
            type: String,
            required: false,
        },
        allGradesAndSections: {
            type: Boolean,
            required: false,
        },
        allUsersSelected: {
            type: Boolean,
            required: false,
        },
        shareWithGradesAndSections: {
            type: [String],
            required: false,
        },
        selectedUsers: {
            type: [Types.ObjectId],
            required: false,
        },
        shareWithAllInstructors: {
            type: Boolean,
            required: false,
        },
        selectedInstructors: {
            type: [Types.ObjectId],
            required: false,
        },
        shareWithAllAdmins: {
            type: Boolean,
            required: false,
        },
        selectedAdmins: {
            type: [Types.ObjectId],
            required: false,
        },
    },
    SchemaTimestamps
);

export const announcementSchema = schema;
