import { Schema, Types } from 'mongoose';

const schema = new Schema(
  {
    cueIds: {
      type: [Types.ObjectId],
      required: true
    }
  }
)

export const folderSchema = schema;
