import { Schema, Types } from 'mongoose';

const schema = new Schema({
    // User ID is not added for Channel Events but ADDED FOR PERSONAL EVENTS OR SCHOOL EVENTS CREATED BY ADMINS
    userId: {
        type: Types.ObjectId,
        required: false,
    },
    title: {
        type: String,
        required: false,
    },
    start: {
        type: Date,
        required: true,
    },
    end: {
        type: Date,
        required: true,
    },
    scheduledMeetingForChannelId: {
        type: Types.ObjectId,
        required: false,
    },
    isNonMeetingChannelEvent: {
        type: Boolean,
        required: false,
    },
    // New Features
    description: {
        type: String,
        required: false,
    },
    recordMeeting: {
        type: Boolean,
        required: false,
    },
    recordingLink: {
        type: String,
        required: false,
    },
    recurringId: {
        type: String,
        required: false,
    },
    // ZOOM
    zoomMeetingId: {
        type: String,
        required: false,
    },
    zoomStartUrl: {
        type: String,
        required: false,
    },
    zoomJoinUrl: {
        type: String,
        required: false,
    },
    zoomMeetingScheduledBy: {
        type: String,
        required: false,
    },
    // Meetings created from Inbox
    isNonChannelMeeting: {
        type: Boolean,
        required: false,
    },
    nonChannelGroupId: {
        type: String,
        required: false,
    },
    // SCHOOL CALENDAR EVENTS IF SCHOOL ID PRESENT (CREATED BY ADMINS)
    schoolId: {
        type: Types.ObjectId,
        required: false,
    },
    // Distinguish between school events / online meetings
    isNonMeetingSchoolEvent: {
        type: Boolean,
        required: false,
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
});

export const dateSchema = schema;
