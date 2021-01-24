import { Arg, Ctx, Authorized, Field, ObjectType } from 'type-graphql';
import { Context } from 'graphql-yoga/dist/types';
import { UserModel } from '../user/mongo/User.model'
import { CueModel } from './mongo/Cue.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { StatusModel } from '../status/mongo/Status.model';

/**
 * User Mutation Endpoints
 */
@ObjectType()
export class CueMutationResolver {

	@Field(type => Boolean, {
		description: 'Used when you want to create a channel cue.'
	})
	public async create(
		@Arg('cue', type => String) cue: string,
		@Arg('color', type => String) color: string,
		@Arg('channelId', type => String) channelId: string,
		@Arg('frequency', type => String) frequency: string,
		@Arg('shuffle', type => Boolean) shuffle: boolean,
		@Arg('starred', type => Boolean) starred: boolean,
		@Arg('createdBy', type => String) createdBy: string,
		@Arg('endPlayAt', { nullable: true }) endPlayAt: string
	) {
		try {
			const newCue = await CueModel.create({
				cue,
				color: Number(color),
				customCategory: '',
				frequency,
				shuffle,
				starred,
				date: new Date(),
				endPlayAt: (endPlayAt && endPlayAt !== '') ? new Date(endPlayAt) : null,
				channelId,
				createdBy
			})

			// Parse cue and send notificatoin to all subscribers...
			// after delivering, crete a status object that stores that the notification was delivered...
			const subscribers = await SubscriptionModel.find({ channelId })
			subscribers.map(async (sub) => {
				await StatusModel.create({
					userId: sub.userId,
					channelId,
					cueId: newCue._id,
					status: 'not-delivered'
				})
			})
			return true

		} catch (e) {
			return false
		}
	}

}
