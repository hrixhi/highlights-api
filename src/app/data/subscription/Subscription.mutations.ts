import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { SubscriptionModel } from './mongo/Subscription.model';
/**
 * Subscription Mutation Endpoints
 */
@ObjectType()
export class SubscriptionMutationResolver {

	@Field(type => String, {
		description: 'Subscribes to a channel & returns "error" or "subscribed" or "incorrect-password" or "your-channel" or "already-subbed".'
	})
	public async subscribe(
		@Arg('userId', type => String) userId: string,
		@Arg('name', type => String) name: string,
		@Arg('password', { nullable: true }) password?: string
	) {
		try {
			const channel = await ChannelModel.findOne({ name })
			if (channel) {
				// Trying to subscribe to one's own channel
				if (channel.createdBy.toString().trim() === userId.toString().trim()) {
					return 'your-channel'
				}
				if (channel.password && channel.password !== '') {
					// Private
					const sub = await SubscriptionModel.findOne({ userId, channelId: channel._id })
					if (sub) {
						return 'already-subbed'
					}
					if (channel.password === password) {
						// Correct password - subscribed!
						await SubscriptionModel.create({
							userId, channelId: channel._id
						})
						return 'subscribed'
					} else {
						// Incorrect password
						return 'incorrect-password'
					}

				} else {
					// Public
					await SubscriptionModel.create({
						userId, channelId: channel._id
					})
					return 'subscribed'
				}
			} else {
				// Channel does not exist
				return 'error';
			}
		} catch (e) {
			// Something went wrong
			return 'error';
		}
	}

}
