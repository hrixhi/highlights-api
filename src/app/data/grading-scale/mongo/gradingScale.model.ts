import { Document, Model, model } from 'mongoose';
import { gradingScaleSchema } from './gradingScale.schema';

export interface IGradingScaleModel extends Document {
    name: string;
    range: any;
    passFailMinumum: number;
    default: boolean;
    schoolId: string;
    standardsBasedScale?: boolean;
    standardsGradeMode?: string;
}

export const GradingScaleModel: Model<IGradingScaleModel> = model<IGradingScaleModel>(
    'grading-scales',
    gradingScaleSchema
);
