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
    }
  }
);



export const channelSchema = schema;
