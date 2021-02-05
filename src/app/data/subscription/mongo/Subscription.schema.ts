import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      required: true
    },
    channelId: {
      type: Types.ObjectId,
      required: true
    },
    unsubscribedAt: {
      type: Date,
      required: false
    },
    keepContent: {
      type: Boolean,
      required: false
    }
  }
)

export const subscriptionSchema = schema;
