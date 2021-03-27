import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    createdBy: {
      type: Types.ObjectId,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: false
    },
    meetingOn: {
      type: Boolean,
      required: false
    }
  }
);



export const channelSchema = schema;
