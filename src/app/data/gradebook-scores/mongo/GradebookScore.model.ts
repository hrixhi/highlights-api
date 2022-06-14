import { Document, Model, model } from 'mongoose';
import { GradebookScoreSchema } from './GradebookScore.schema';

export interface IGradebookScoreModel extends Document {
    gradebookEntryId: string;
    channelId: string;
    userId: string;
    submitted: boolean;
    points?: number;
    score?: number;
    submittedAt?: Date;
    lateSubmission?: boolean;
    feedback?: string;
}

export const GradebookScoreModel: Model<IGradebookScoreModel> = model<IGradebookScoreModel>(
    'gradebook-scores',
    GradebookScoreSchema
);
