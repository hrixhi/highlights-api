import { Document, Model, model } from 'mongoose';
import { academicTermSchema } from './academicTerm.schema';

export interface IAcademicTermModel extends Document {
    name: string;
    startDate: Date;
    endDate: Date;
    default: boolean;
    schoolId: string;
}

export const AcademicTermModel: Model<IAcademicTermModel> = model<IAcademicTermModel>(
    'academicTerm',
    academicTermSchema
);
