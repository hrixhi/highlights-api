import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      required: true
    },
    cueId: {
      type: Types.ObjectId,
      required: true
    },
    cue: {
      type: String,
      required: false
    },
    shuffle: {
      type: Boolean,
      required: true
    },
    frequency: {
      type: String,
      required: true
    },
    customCategory: {
      type: String,
      required: false
    },
    starred: {
      type: Boolean,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    color: {
      type: Number,
      required: true
    },
    createdBy: {
      type: Types.ObjectId,
      required: true
    },
    channelId: {
      type: Types.ObjectId,
      required: false
    },
    endPlayAt: {
      type: Date,
      required: false
    },
    // New - for submission and grades
    submittedAt: {
      type: Date,
      required: false
    },
    score: {
      type: Number,
      required: false
    },
    graded: {
      type: Boolean,
      required: false
    },
    submission: {
      type: Boolean,
      required: false
    },
    comment: {
      type: String,
      required: false
    },
    deadline: {
      type: Date,
      required: false
    },
    initiateAt: {
      type: Date,
      required: false
    },
    gradeWeight: {
      type: Number,
      required: false
    },
    releaseSubmission: {
      type: Boolean,
      required: false
    },
    regradedAt: {
      type: Date,
      required: false
    },
    allowedAttempts: {
      type: Number,
      required: false
    },
    annotations: {
      type: String,
      required: false
    },
    folderId: {
      type: String,
      required: false
    },
    availableUntil: {
      type: Date,
      required: false
    },
    restrictAccess: {
      type: Boolean,
      required: false
    }
  }
)

export const modifiationSchema = schema;
