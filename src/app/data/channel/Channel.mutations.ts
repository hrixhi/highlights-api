import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from './mongo/Channel.model'
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import Expo from 'expo-server-sdk';
import { UserModel } from '../user/mongo/User.model';
import { htmlStringParser } from '@helper/HTMLParser';
import * as OneSignal from 'onesignal-node';
import { GroupModel } from '../group/mongo/Group.model';
import { DateModel } from '../dates/mongo/dates.model';


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
				}).catch((err: any) => {
					console.log(err);
				})
			} else {
				// create meeting on VDO server
				const fullName = encodeURI(encodeURIComponent(channel.name.replace(/[^a-z0-9]/gi, '').split(' ').join('').trim()))
				const params =
					'allowStartStopRecording=true' +
					'&attendeePW=' + atendeePass +
					'&autoStartRecording=false' +
					'&meetingID=' + channelId +
					'&moderatorPW=' + modPass +
					'&name=' + (fullName.length > 0 ? fullName : Math.floor(Math.random() * (999 - 100 + 1) + 100).toString()) +
					'&record=true'
				const toHash = (
					'create' + params + vdoKey
				)
				const checkSum = sha1(toHash)
				const url = vdoURL + 'create?' + params + '&checksum=' + checkSum

				axios.get(url).then(async (res: any) => {
					const subscribers = await SubscriptionModel.find({ channelId, unsubscribedAt: { $exists: false } })
					const userIds: any[] = []
					const messages: any[] = []
					const notificationService = new Expo()
					subscribers.map(u => {
						userIds.push(u.userId)
					})

					// Web notifications

					const oneSignalClient = new OneSignal.Client('51db5230-f2f3-491a-a5b9-e4fba0f23c76', 'Yjg4NTYxODEtNDBiOS00NDU5LTk3NDItZjE3ZmIzZTVhMDBh')


					const notification = {
						contents: {
							'en': 'The host is now in the meeting! - ' + channel.name,
						},
						include_external_user_ids: userIds
					}

					const response = await oneSignalClient.createNotification(notification)

					const users = await UserModel.find({ _id: { $in: userIds } })
					users.map(sub => {
						const notificationIds = sub.notificationId.split('-BREAK-')
						notificationIds.map((notifId: any) => {
							if (!Expo.isExpoPushToken(notifId)) {
								return
							}
							messages.push({
								to: notifId,
								sound: 'default',
								subtitle: 'The host is now in the meeting!',
								title: channel.name + ' - Meeting Started',
								data: { userId: sub._id },
							})
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
		description: 'Used when you want to allow or disallow people from joining meeting.'
	})
	public async editPersonalMeeting(
		@Arg('users', type => [String]) users: string[],
		@Arg('meetingOn', type => Boolean) meetingOn: boolean,
		@Arg('channelId', type => String) channelId: string,
	) {
		try {

			const groupDoc = await GroupModel.findOne({
				users: { $all: users }
			});
			let groupId = "";
			if (groupDoc) {
				groupId = groupDoc._id;
			} else {
				const newGroup = await GroupModel.create({
					users,
					channelId
				});
				groupId = newGroup._id;
			}

			await GroupModel.updateOne({ _id: groupId }, { meetingOn })
			const channelDoc: any = await ChannelModel.findById(channelId)


			const channel = channelDoc.toObject()
			const axios = require('axios')
			const sha1 = require('sha1');
			const vdoURL = 'https://my1.vdo.click/bigbluebutton/api/'
			const vdoKey = 'bLKw7EqEyEoUvigSbkFr7HDdkzofdbtxakwfccl1VrI'

			if (!meetingOn) {
				// end meeting on VDO server
				const params = 'password=' + groupId +
					'&meetingID=' + groupId

				const toHash = (
					'end' + params + vdoKey
				)
				const checkSum = sha1(toHash)
				axios.get(vdoURL + 'end?' + params + '&checksum=' + checkSum).then((res: any) => {
				}).catch((err: any) => {
					console.log(err);
				})
			} else {
				// create meeting on VDO server
				const fullName = Math.floor(Math.random() * (9999 - 1000 + 1) + 100).toString()
				const params =
					'allowStartStopRecording=true' +
					'&attendeePW=' + 'password' +	// attendee pass but we dont have attendees, only mods
					'&autoStartRecording=false' +
					'&clientURL=web.cuesapp.co' +
					'&logoutURL=web.cuesapp.co' +
					'&meetingID=' + groupId +
					'&moderatorPW=' + groupId +
					'&name=' + fullName +
					'&record=false'
				const toHash = (
					'create' + params + vdoKey
				)
				const checkSum = sha1(toHash)
				const url = vdoURL + 'create?' + params + '&checksum=' + checkSum

				axios.get(url).then(async (res: any) => {
					const messages: any[] = []
					const notificationService = new Expo()
					const userDocs = await UserModel.find({ _id: { $in: users } })

					let participantNames = ''
					userDocs.map((u: any, index: any) => {
						const sub = u.toObject()
						if (index === userDocs.length - 1) {
							participantNames += sub.displayName
						} else {
							participantNames += (sub.displayName + ', ')
						}
					})

					// Web notifications
					const oneSignalClient = new OneSignal.Client('51db5230-f2f3-491a-a5b9-e4fba0f23c76', 'Yjg4NTYxODEtNDBiOS00NDU5LTk3NDItZjE3ZmIzZTVhMDBh')
					const notification = {
						contents: {
							'en': channel.name + ' - Private meeting initiated with ' + participantNames
						},
						include_external_user_ids: users
					}
					const response = await oneSignalClient.createNotification(notification)
					userDocs.map(u => {
						const sub = u.toObject()
						const notificationIds = sub.notificationId.split('-BREAK-')
						notificationIds.map((notifId: any) => {
							if (!Expo.isExpoPushToken(notifId)) {
								return
							}
							messages.push({
								to: notifId,
								sound: 'default',
								subtitle: participantNames,
								title: channel.name + ' - Private meeting initiated',
								data: { userId: sub._id },
							})
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

	@Field(type => Boolean, {
		description: 'Used when you want to allow or disallow people from joining meeting.'
	})
	public async deleteRecording(
		@Arg('recordID', type => String) recordID: string
	) {

		try {

			const axios = require('axios')
			const sha1 = require('sha1');
			const vdoURL = 'https://my1.vdo.click/bigbluebutton/api/'
			const vdoKey = 'bLKw7EqEyEoUvigSbkFr7HDdkzofdbtxakwfccl1VrI'
			let params =
				'recordID=' + recordID

			const toHash = (
				'deleteRecordings' + params + vdoKey
			)
			const checkSum = sha1(toHash)
			const url = vdoURL + 'deleteRecordings?' + params + '&checksum=' + checkSum
			await axios.get(url)
			return true

		} catch (e) {
			console.log(e)
			return false
		}

	}

}
