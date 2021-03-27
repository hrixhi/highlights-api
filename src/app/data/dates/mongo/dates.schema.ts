import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  }
)

export const dateSchema = schema;
