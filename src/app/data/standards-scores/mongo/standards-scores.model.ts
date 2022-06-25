import { Document, Model, model } from 'mongoose';
import { standardsScoresSchema } from './standards-scores.schema';

export interface IStandardsScoresModel extends Document {
    standardId: string;
    userId: string;
    points: number;
    overridden?: boolean;
}

export const StandardsScoresModel: Model<IStandardsScoresModel> = model<IStandardsScoresModel>(
    'standards-scores',
    standardsScoresSchema
);
