import { Document, Model, model } from 'mongoose';
import { cueSchema } from './Cue.schema';

export interface ICueModel extends Document {
	cue: string;
	shuffle: boolean;
	frequency: string;
	starred: boolean;
	date: Date;
	color: number;
	createdBy: string;
	channelId?: string;
	endPlayAt?: Date;
	customCategory?: string;
}

export const CueModel: Model<ICueModel> = model<ICueModel>(
	'cues',
	cueSchema,
);
