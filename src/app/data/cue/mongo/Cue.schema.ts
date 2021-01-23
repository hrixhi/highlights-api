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
      required: true
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
    }
  }
)

export const cueSchema = schema;
