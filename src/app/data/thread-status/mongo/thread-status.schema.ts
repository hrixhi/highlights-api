import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    threadId: {
      type: Types.ObjectId,
      required: true
    },
    userId: {
      type: Types.ObjectId,
      required: true
    },
    channelId: {
      type: Types.ObjectId,
      required: true
    },
    cueId: {
      type: Types.ObjectId,
      required: false
    },
    read: {
      type: Boolean,
      required: false,
      default: false
    }
  }
)

export const threadStatusSchema = schema;
