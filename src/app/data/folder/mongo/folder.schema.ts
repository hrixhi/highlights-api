import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    cueIds: {
      type: [Types.ObjectId],
      required: true
    },
    title: {
      type: String,
      required: false
    }
  }
)

export const folderSchema = schema;
