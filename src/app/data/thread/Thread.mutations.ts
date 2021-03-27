import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { ThreadStatusModel } from '../thread-status/mongo/thread-status.model';
import { UserModel } from '../user/mongo/User.model';
import { ThreadModel } from './mongo/Thread.model';

/**
 * Thread Mutation Endpoints
 */
@ObjectType()
export class ThreadMutationResolver {

	@Field(type => Boolean, {
		description: 'Creates new message'
	})
	public async writeMessage(
		@Arg('message', type => String) message: string,
		@Arg('userId', type => String) userId: string,
		@Arg('channelId', type => String) channelId: string,
		@Arg('isPrivate', type => Boolean) isPrivate: boolean,
		@Arg('anonymous', type => Boolean) anonymous: boolean,
		@Arg('parentId', type => String) parentId: string,
		@Arg('cueId', type => String) cueId: string,
		@Arg('category', { nullable: true }) category?: string,
	) {
		try {
			const thread = await ThreadModel.create({
				message,
				userId,
				channelId,
				isPrivate,
				anonymous,
				time: new Date(),
				category,
				cueId: cueId === 'NULL' ? null : cueId,
				parentId: parentId === 'INIT' ? null : parentId
			})
			if (!isPrivate) {
				// Public thread
				// Create badge for everyone in the channel
				const subscribers = await SubscriptionModel.find({
					channelId,
					unsubscribedAt: { $exists: false }
				})
				subscribers.map(async (s) => {
					const subscriber = s.toObject()
					if (s.userId.toString().trim() === userId.toString().trim()) {
						// sender does not need notif
						return;
					}
					await ThreadStatusModel.create({
						cueId: cueId === 'NULL' ? undefined : cueId,
						userId: subscriber.userId,
						threadId: parentId === 'INIT' ? thread._id : parentId,
						channelId
					})
				})
			} else {
				// Private thread
				// Create badges for the owner only
				const channel = await ChannelModel.findById(channelId)
				if (channel) {
					const obj = channel.toObject()
					await ThreadStatusModel.create({
						cueId: cueId === 'NULL' ? undefined : cueId,
						userId: obj.createdBy,
						threadId: parentId === 'INIT' ? thread._id : parentId,
						channelId
					})
				}
			}
			return true
		} catch (e) {
			return false;
		}
	}

}
