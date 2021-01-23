import { SchemaTimestamps } from '@service/MongoDB/modules/Timestamps';
import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    notificationId: {
      type: String,
      required: true
    },
    fullName: {
      type: String,
      required: true
    },
    displayName: {
      type: String,
      required: true
    }
  },
  SchemaTimestamps
);

export const UserSchema = schema;
