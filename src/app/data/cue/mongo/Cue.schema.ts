import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    cue: {
      type: String,
      required: true
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
    submission: {
      type: Boolean,
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
    limitedShares: {
      type: Boolean,
      required: false
    }
  }
)

export const cueSchema = schema;
