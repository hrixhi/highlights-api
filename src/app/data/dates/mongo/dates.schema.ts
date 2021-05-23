import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      required: false
    },
    title: {
      type: String,
      required: true
    },
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    },
    scheduledMeetingForChannelId: {
      type: Types.ObjectId,
      required: false
    },
    isNonMeetingChannelEvent: {
      type: Boolean,
      required: false
    }
  }
)

export const dateSchema = schema;
