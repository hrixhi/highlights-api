import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    }
  }
)

export const schoolSchema = schema;
