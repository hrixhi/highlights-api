import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    message: {
      type: String,
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
    isPrivate: {
      type: Boolean,
      required: true
    },
    anonymous: {
      type: Boolean,
      required: true
    },
    time: {
      type: Date,
      required: true
    },
    cueId: {
      type: Types.ObjectId,
      required: false
    },
    category: {
      type: String,
      required: false
    },
    parentId: {
      type: Types.ObjectId,
      required: false
    }
  }
)

export const threadSchema = schema;
