import { Document, Model, model } from 'mongoose';
import { folderSchema } from './folder.schema';

export interface IFolderModel extends Document {
	cueIds: string[];
	title?: string;
}

export const FolderModel: Model<IFolderModel> = model<IFolderModel>(
	'folders',
	folderSchema,
);
