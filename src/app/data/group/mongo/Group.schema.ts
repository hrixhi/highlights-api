import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    users: {
      type: [Types.ObjectId],
      required: true
    },
    channelId: {
      type: String,
      required: false
    },
    meetingOn: {
      type: Boolean,
      required: false
    }
  }
)

export const groupSchema = schema;
