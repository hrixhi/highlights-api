import { Document, Model, model } from 'mongoose';
import { standardsSchema } from './Standards.schema';

export interface IStandardsModel extends Document {
    title: string;
    description?: string;
    category?: string;
    channelId?: string;
}

export const StandardsModel: Model<IStandardsModel> = model<IStandardsModel>('standards', standardsSchema);
