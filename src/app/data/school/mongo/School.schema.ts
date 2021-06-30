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
    },
    logo: {
      type: String,
      required: false
    },
    allowStudentChannelCreation: {
      type: Boolean,
      required: false
    },
    recoveryEmail: {
      type: String,
      required: false
    }
  }
)

export const schoolSchema = schema;
