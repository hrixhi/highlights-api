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
    },
    name: {
      type: String,
      required: false
    },
    image: {
      type: String,
      required: false
    },
    createdBy: {
      type: Types.ObjectId,
      required: true
    },
  }
)

export const groupSchema = schema;
