import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from './mongo/Channel.model'
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import Expo from 'expo-server-sdk';
import { UserModel } from '../user/mongo/User.model';
import { htmlStringParser } from '@helper/HTMLParser';

/**
 * Channel Mutation Endpoints
 */
@ObjectType()
export class ChannelMutationResolver {

	@Field(type => String, {
		description: 'Used when you want to create a channel.'
	})
	public async create(
		@Arg('name', type => String) name: string,
		@Arg('createdBy', type => String) createdBy: string,
		@Arg('password', { nullable: true }) password?: string
	) {
		try {
			// name should be valid
			if (name
				&& name.toString().trim() !== ''
				&& name.toString().trim() !== 'All'
				&& name.toString().trim() !== 'All-Channels'
			) {
				// check for existing channel
				const exists = await ChannelModel.findOne({
					name: name.toString().trim()
				})
				if (exists) {
					return 'exists'
				}

				// create channel
				const channel = await ChannelModel.create({
					name: name.toString().trim(),
					password,
					createdBy
				})
				await SubscriptionModel.create({
					userId: createdBy,
					channelId: channel._id
				})
				return 'created'

			} else {
				return 'invalid-name'
			}
		} catch (e) {
			console.log(e)
			return 'error'
		}
	}

	@Field(type => Boolean, {
		description: 'Used when you want to allow or disallow people from joining meeting.'
	})
	public async editMeeting(
		@Arg('channelId', type => String) channelId: string,
		@Arg('meetingOn', type => Boolean) meetingOn: boolean,
	) {
		try {
			await ChannelModel.updateOne({ _id: channelId }, { meetingOn })
			const channel: any = await ChannelModel.findById(channelId)
			if (meetingOn) {
				const subscribers = await SubscriptionModel.find({ channelId, unsubscribedAt: { $exists: false } })
				const userIds: any[] = []
				const messages: any[] = []
				const notificationService = new Expo()
				subscribers.map(u => {
					userIds.push(u.userId)
				})
				const users = await UserModel.find({ _id: { $in: userIds } })
				users.map(sub => {
					if (!Expo.isExpoPushToken(sub.notificationId)) {
						return
					}
					messages.push({
						to: sub.notificationId,
						sound: 'default',
						title: 'Meeting Started!',
						subtitle: channel.name,
						body: channel.name,
						data: { userId: sub._id },
					})
				})
				let chunks = notificationService.chunkPushNotifications(messages);
				for (let chunk of chunks) {
					try {
						await notificationService.sendPushNotificationsAsync(chunk);
					} catch (e) {
						console.error(e);
					}
				}
			}
			return true
		} catch (e) {
			console.log(e)
			return false
		}
	}

}
