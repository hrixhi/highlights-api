import { Document, Model, model } from 'mongoose';
import { schoolSchema } from './School.schema';

export interface ISchoolsModel extends Document {
    name: string;
    email: string;
    cuesDomain: string;
    phoneNumber: string;
    website: string;
    country?: string;
    logo?: string;
    recoveryEmail?: string;
    streamId?: string;
    workosOrgId?: string;
    ssoEnabled?: boolean;
    ssoDomain?: string;
    workosConnection?: any;
    meetingProvider?: string;
    createdByUser?: string;
    stripeAccountId?: string;
    enableStandardsBasedGrading?: boolean;
    // NOT REQUIRED
    password?: string;
    allowStudentChannelCreation?: boolean;
}

export const SchoolsModel: Model<ISchoolsModel> = model<ISchoolsModel>('schools', schoolSchema);
