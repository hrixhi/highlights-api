import { Document, Model, model } from 'mongoose';
import { emailSchema } from './email.schema';

export interface IEmailModel extends Document {
    emailId: string;
    unsubscribedAt?: Date;
}

export const EmailModel: Model<IEmailModel> = model<IEmailModel>('emails', emailSchema);
