import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    users: {
      type: [Types.ObjectId],
      required: true
    },
  }
)

export const groupSchema = schema;
