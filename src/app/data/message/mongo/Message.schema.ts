import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    sentBy: {
      type: Types.ObjectId,
      required: true
    },
    groupId: {
      type: Types.ObjectId,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    sentAt: {
      type: Date,
      required: true
    }
  }
)

export const messageSchema = schema;
