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
    },
    email: {
      type: String,
      required: false
    },
    password: {
      type: String,
      required: false
    },
    sleepTo: {
      type: String,
      required: false
    },
    sleepFrom: {
      type: String,
      required: false
    },
    randomShuffleFrequency: {
      type: String,
      required: false
    },
    currentDraft: {
      type: String,
      required: false
    }
  },
  SchemaTimestamps
);

export const UserSchema = schema;
