import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from './mongo/Channel.model'
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';

/**
 * Channel Mutation Endpoints
 */
@ObjectType()
export class ChannelMutationResolver {

	@Field(type => Boolean, {
		description: 'Used when you want to delete a user.'
	})
	public async create(
		@Arg('name', type => String) name: string,
		@Arg('createdBy', type => String) createdBy: string,
		@Arg('password', { nullable: true }) password?: string
	) {
		try {
			const channel = await ChannelModel.create({
				name,
				password,
				createdBy
			})
			await SubscriptionModel.create({
				userId: createdBy,
				channelId: channel._id
			})
			return true
		} catch (e) {
			console.log(e)
			return false
		}
	}

}
