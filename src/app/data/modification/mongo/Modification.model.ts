import { Document, Model, model } from 'mongoose';
import { modifiationSchema } from './Modification.schema';

export interface IModificationsModel extends Document {
	userId: any;
	cueId: any;
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

export const ModificationsModel: Model<IModificationsModel> = model<IModificationsModel>(
	'modifications',
	modifiationSchema,
);
