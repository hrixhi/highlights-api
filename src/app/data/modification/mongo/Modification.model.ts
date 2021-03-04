import { Document, Model, model } from 'mongoose';
import { modifiationSchema } from './Modification.schema';

export interface IModificationsModel extends Document {
	shuffle: boolean;
	frequency: string;
	starred: boolean;
	date: Date;
	color: number;
	createdBy: string;
	channelId?: string;
	endPlayAt?: Date;
	customCategory?: string;
	cue?: string;
	// On top of CUE COPY
	userId: any;
	cueId: any;
	submission?: boolean;
	deadline?: Date;
	gradeWeight?: number;
	submittedAt?: Date;
	score?: number;
	graded?: boolean;

}

export const ModificationsModel: Model<IModificationsModel> = model<IModificationsModel>(
	'modifications',
	modifiationSchema,
);
