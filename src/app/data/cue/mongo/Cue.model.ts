import { Document, Model, model } from 'mongoose';
import { cueSchema } from './Cue.schema';

export interface ICueModel extends Document {
	cue: string;
	shuffle: boolean;
	frequency: string;
	starred: boolean;
	date: Date;
	color: number;
	createdBy: any;
	channelId?: any;
	endPlayAt?: Date;
	customCategory?: string;
	// New - for submission and grades
	submission?: boolean;
	deadline?: Date;
	initiateAt?: Date;
	gradeWeight?: number;
	releaseSubmission?: boolean;
	// not stored in modification
	// does not need type object
	limitedShares?: boolean;
	folderId?: string;
}

export const CueModel: Model<ICueModel> = model<ICueModel>(
	'cues',
	cueSchema,
);
