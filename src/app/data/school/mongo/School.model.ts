import { Document, Model, model } from 'mongoose';
import { schoolSchema } from './School.schema';

export interface ISchoolsModel extends Document {
    name: string;
    password: string;
    cuesDomain: string;
    logo?: string;
    allowStudentChannelCreation?: boolean;
    recoveryEmail?: string;
    streamId?: string;
    workosOrgId?: string;
    ssoEnabled?: boolean;
    ssoDomain?: string;
    workosConnection?: any;
}

export const SchoolsModel: Model<ISchoolsModel> = model<ISchoolsModel>('schools', schoolSchema);
