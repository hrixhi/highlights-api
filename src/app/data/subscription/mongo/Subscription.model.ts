import { Document, Model, model } from 'mongoose';
import { subscriptionSchema } from './Subscription.schema';

export interface ISubscriptionModel extends Document {
	userId: string;
	channelId: string;
}

export const SubscriptionModel: Model<ISubscriptionModel> = model<ISubscriptionModel>(
	'subscriptions',
	subscriptionSchema,
);
