import { GradebookEntrySchema } from './GradebookEntry.schema';
import { Document, Model, model } from 'mongoose';

export interface IGradebookEntryModel extends Document {
    title: string;
    totalPoints: number;
    gradeWeight: number;
    deadline: Date;
    channelId: string;
}

export const GradebookEntryModel: Model<IGradebookEntryModel> = model<IGradebookEntryModel>(
    'gradebook-entries',
    GradebookEntrySchema
);
