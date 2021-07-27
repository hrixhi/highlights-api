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
    },
    creatorUnsubscribed: {
      type: Boolean,
      required: false
    },
    temporary: {
      type: Boolean,
      required: false
    },
    owners: {
      type: [String],
      required: false
    },
    colorCode: {
      type: String,
      required: false
    }
  }
);



export const channelSchema = schema;
