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
				const sub = await SubscriptionModel.findOne({
					userId,
					channelId: channel._id,
					unsubscribedAt: { $exists: false }
				})
				if (sub) {
					return 'already-subbed'
				}
				if (channel.password && channel.password !== '') {

					if (password === undefined || password === null || password === '') {
						return 'incorrect-password'
					}
					// Private
					if (channel.password.toString().trim() === password.toString().trim()) {
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

	@Field(type => Boolean, {
		description: 'Unsubscribes from channel'
	})
	public async unsubscribe(
		@Arg('userId', type => String) userId: string,
		@Arg('channelId', type => String) channelId: string,
		@Arg('keepContent', type => Boolean) keepContent: boolean
	) {
		try {
			const subObject = await SubscriptionModel.findOne({
				userId, channelId, unsubscribedAt: { $exists: false }
			})
			if (!subObject) {
				return false
			}
			await SubscriptionModel.updateOne({
				userId, channelId, unsubscribedAt: { $exists: false }
			}, {
				unsubscribedAt: new Date(),
				keepContent
			})
			return true
		} catch (e) {
			console.log(e)
			return false
		}
	}

}
