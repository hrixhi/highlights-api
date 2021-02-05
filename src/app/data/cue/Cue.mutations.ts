import { Arg, Ctx, Authorized, Field, ObjectType } from 'type-graphql';
import { Context } from 'graphql-yoga/dist/types';
import { UserModel } from '../user/mongo/User.model'
import { CueModel } from './mongo/Cue.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { StatusModel } from '../status/mongo/Status.model';

import { Expo } from 'expo-server-sdk';
import { htmlStringParser } from '@helper/HTMLParser';

/**
 * Cue Mutation Endpoints
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
		@Arg('endPlayAt', { nullable: true }) endPlayAt?: string,
		@Arg('customCategory', { nullable: true }) customCategory?: string,
	) {
		try {

			const newCue = await CueModel.create({
				cue,
				color: Number(color),
				customCategory: (customCategory && customCategory !== '') ? customCategory : '',
				frequency,
				shuffle,
				starred,
				date: new Date(),
				endPlayAt: (endPlayAt && endPlayAt !== '') ? new Date(endPlayAt) : null,
				channelId,
				createdBy
			})

			const notificationService = new Expo()
			const messages: any[] = []
			const userIds: string[] = []
			const tickets = [];

			const subscriptions = await SubscriptionModel.find({
				$and: [{ channelId }, { unsubscribedAt: { $exists: false } }]
			})
			subscriptions.map((s) => {
				userIds.push(s.userId)
			})
			const subscribers = await UserModel.find({ _id: { $in: userIds } })

			subscribers.map((sub) => {
				if (!Expo.isExpoPushToken(sub.notificationId)) {
					return;
				}
				const { title, subtitle: body } = htmlStringParser(cue)
				messages.push({
					to: sub.notificationId,
					sound: 'default',
					title,
					body,
					data: { userId: sub._id },
				})
			})

			let chunks = notificationService.chunkPushNotifications(messages);
			for (let chunk of chunks) {
				try {
					let ticketChunk = await notificationService.sendPushNotificationsAsync(chunk);
					tickets.push(...ticketChunk);
				} catch (e) {
					console.error(e);
				}
			}
			tickets.map(async (ticket: any, index: any) => {
				await StatusModel.create({
					userId: messages[index].data.userId,
					channelId,
					cueId: newCue._id,
					status: ticket.status === 'ok' ? 'delivered' : 'not-delivered'
				})
			})

			return true

		} catch (e) {

			console.log(e)
			return false

		}
	}

}
