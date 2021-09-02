import { Document, Model, model } from 'mongoose';
import { schoolSchema } from './School.schema';

export interface ISchoolsModel extends Document {
	name: string;
	password: string;
	logo?: string;
	allowStudentChannelCreation?: boolean;
	recoveryEmail?: string;
	streamId?: string;
}

export const SchoolsModel: Model<ISchoolsModel> = model<ISchoolsModel>(
	'schools',
	schoolSchema,
);
