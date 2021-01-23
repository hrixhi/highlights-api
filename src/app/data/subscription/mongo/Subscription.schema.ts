import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    userId: {
      type: String,
      required: true
    },
    channelId: {
      type: String,
      required: true
    },
  }
)

export const subscriptionSchema = schema;
