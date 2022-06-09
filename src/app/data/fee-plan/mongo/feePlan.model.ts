import { FeePlanSchema } from '@app/data/fee-plan/mongo/feePlan.schema';
import { Document, Model, model } from 'mongoose';

export interface IFeePlanModel extends Document {
    name: string;
    type: string;
    feeAmount?: number;
    invoiceItems?: any[];
    billingType: string;
    paymentDue?: Date;
    dayOfMonth?: number;
    startMonth?: Date;
    endMonth?: Date;
    term?: string;
    schoolId: string;
}

export const FeePlanModel: Model<IFeePlanModel> = model<IFeePlanModel>('fee-plans', FeePlanSchema);
