import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      required: true
    },
    dateId: {
      type: Types.ObjectId,
      required: true
    },
    channelId: {
      type: Types.ObjectId,
      required: true
    },
    joinedAt: {
      type: Date,
      required: false
    }
  }
)

export const attendanceSchema = schema;
