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

			const axios = require('axios')
			const sha1 = require('sha1');
			const vdoURL = 'https://my1.vdo.click/bigbluebutton/api/'
			const vdoKey = 'bLKw7EqEyEoUvigSbkFr7HDdkzofdbtxakwfccl1VrI'
			const atendeePass = channelId
			const modPass: any = channel.createdBy

			if (!meetingOn) {
				// end meeting on VDO server
				const params = 'password=' + modPass +
					'&meetingID=' + channelId

				const toHash = (
					'end' + params + vdoKey
				)
				const checkSum = sha1(toHash)
				axios.get(vdoURL + 'end?' + params + '&checksum=' + checkSum).then((res: any) => {
					console.log(res.data);
				}).catch((err: any) => {
					console.log(err);
				})
			} else {
				// create meeting on VDO server
				const params =
					'allowStartStopRecording=true' +
					'&attendeePW=' + atendeePass +
					'&autoStartRecording=false' +
					'&meetingID=' + channelId +
					'&moderatorPW=' + modPass +
					'&name=' + channel.name +
					'&record=false'
				const toHash = (
					'create' + params + vdoKey
				)
				console.log(toHash)
				const checkSum = sha1(toHash)
				console.log(checkSum)
				const url = vdoURL + 'create?' + params + '&checksum=' + checkSum
				console.log(url)
				axios.get(url).then(async (res: any) => {
					console.log(res.data)
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
							subtitle: 'Meeting Started!',
							title: channel.name,
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
				}).catch((err: any) => {
					console.log(err);
				})
			}
			return true
		} catch (e) {
			console.log(e)
			return false
		}
	}

	@Field(type => Boolean, {
		description: 'Used when owner wants to set up new password.'
	})
	public async update(
		@Arg('channelId', type => String) channelId: string,
		@Arg('name', type => String) name: string,
		@Arg('password', type => String, { nullable: true }) password?: string,
	) {
		try {
			await ChannelModel.updateOne(
				{ _id: channelId },
				{ name, password: password && password !== '' ? password : undefined }
			)
			return true
		} catch (e) {
			console.log(e)
			return false
		}
	}

}
