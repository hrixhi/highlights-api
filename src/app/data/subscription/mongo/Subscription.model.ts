import { Document, Model, model } from 'mongoose';
import { subscriptionSchema } from './Subscription.schema';

export interface ISubscriptionModel extends Document {
	userId: any;
	channelId: any;
	unsubscribedAt?: Date;
	keepContent?: boolean;
}

export const SubscriptionModel: Model<ISubscriptionModel> = model<ISubscriptionModel>(
	'subscriptions',
	subscriptionSchema,
);
