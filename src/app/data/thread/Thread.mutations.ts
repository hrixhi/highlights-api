import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { ThreadStatusModel } from '../thread-status/mongo/thread-status.model';
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
			await ThreadStatusModel.create({
				cueId: cueId === 'NULL' ? undefined : cueId,
				userId,
				threadId: parentId === 'INIT' ? thread._id : parentId,
				channelId
			})
			return true
		} catch (e) {
			return false;
		}
	}

}
