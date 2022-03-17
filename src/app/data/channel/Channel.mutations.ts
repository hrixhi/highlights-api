import { Arg, Field, ObjectType, Subscription } from 'type-graphql';
import { ChannelModel } from './mongo/Channel.model'
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import Expo from 'expo-server-sdk';
import { UserModel } from '../user/mongo/User.model';
import { htmlStringParser } from '@helper/HTMLParser';
import * as OneSignal from 'onesignal-node';
import { GroupModel } from '../group/mongo/Group.model';
import { DateModel } from '../dates/mongo/dates.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { ThreadModel } from '../thread/mongo/Thread.model';
import { ThreadStatusModel } from '../thread-status/mongo/thread-status.model';
import { ActivityModel } from '../activity/mongo/activity.model';
import axios from 'axios'
import shortid from 'shortid';
import { zoomClientId, zoomClientSecret } from '../../../helpers/zoomCredentials'
import moment from 'moment';
import { SchoolsModel } from '../school/mongo/School.model';
import { hashPassword } from '../methods';
import { AddUsersEmailObject } from './types/AddUsersEmailObject.type';
import { EmailService } from '../../../emailservice/Postmark';

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
		@Arg('password', type => String,  { nullable: true }) password?: string,
		@Arg('temporary', type => Boolean, { nullable: true }) temporary?: boolean,
		@Arg('colorCode', type => String, { nullable: true }) colorCode?: string,
		@Arg('description', type => String, { nullable: true }) description?: string,
		@Arg('tags', type => [String], { nullable: true }) tags?: string[],
		@Arg('isPublic', type => Boolean, { nullable: true }) isPublic?: boolean,
		@Arg('subscribers', type => [String], { nullable: true }) subscribers?: string[],
		@Arg('moderators', type => [String], { nullable: true }) moderators?: string[],
		@Arg('sisId', type => String, { nullable: true }) sisId?: string,
	) {
		try {

			
			// name should be valid
			if (name
				&& name.toString().trim() !== ''
				&& name.toString().trim() !== 'All'
				&& name.toString().trim() !== 'All-Channels' 
				&& name.toString().trim().toLowerCase() !== 'home'
				&& name.toString().trim().toLowerCase() !== 'cues'
				&& name.toString().trim().toLowerCase() !== 'my notes'
			) {

				const fetchUser = await UserModel.findById(createdBy);

				if (!fetchUser) {
					return 'invalid-user'
				}

				// Check if SIS ID is duplicate
				if (sisId && sisId !== '') {
					const existingChannel = await ChannelModel.findOne({
						sisId,
						schoolId: fetchUser.schoolId ? fetchUser.schoolId : undefined,
					})

					if (existingChannel) {
						return 'sisid-in-use'
					}
				} 


				const channel = await ChannelModel.create({
					name: name.toString().trim(),
					password,
					createdBy,
					temporary: temporary ? true : false,
					colorCode,
					tags,
					description,
					accessCode: shortid.generate(),
					isPublic: isPublic ? true : false,
					owners: moderators ? moderators : [],
					schoolId: fetchUser.schoolId ? fetchUser.schoolId : undefined,
					sisId: sisId ? sisId : ''
				})

				if (!channel || !channel._id) {
					return 'error'
				}

				// Subscribe Owner
				await SubscriptionModel.create({
					userId: createdBy,
					channelId: channel._id
				})

				let usersAdded: string[] =  []

				// Rest of Subscribers and Moderators
				if (subscribers && subscribers.length > 0) {

					for (const sub of subscribers) {

						if (sub.toString().trim() !== createdBy.toString().trim()) {

							const newSub = await SubscriptionModel.create({
								userId: sub,
								channelId: channel._id
							})

							// console.log("New Sub", newSub)
							// Add alerts for subscribers when they are added to the channel
							if (newSub) {
								usersAdded.push(sub.toString().trim());
							}

						}
						
					}

				}

				const subtitle = 'You have been added to the course.'
				const title = channel.name + ' - Subscribed!'
				const messages: any[] = []
				const subscribersAdded = await UserModel.find({ _id: { $in: usersAdded } })
				const activity: any[] = []
				
				// console.log("Subscribers Added", subscribersAdded);

				subscribersAdded.map((sub) => {
					const notificationIds = sub.notificationId.split('-BREAK-')
					notificationIds.map((notifId: any) => {
						if (!Expo.isExpoPushToken(notifId)) {
							return
						}
						messages.push({
							to: notifId,
							sound: 'default',
							subtitle: subtitle,
							title: title,
							body: '',
							data: { userId: sub._id },
						})
					})
					activity.push({
						userId: sub._id,
						subtitle,
						title: 'Subscribed',
						status: 'unread',
						date: new Date(),
						channelId: channel._id,
						target: 'CHANNEL_SUBSCRIBED'
					})
				})

				// console.log("Send notifications to", usersAdded);


				await ActivityModel.insertMany(activity)
				const oneSignalClient = new OneSignal.Client('78cd253e-262d-4517-a710-8719abf3ee55', 'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5')
				const notification = {
					contents: {
						'en': title,
					},
					include_external_user_ids: usersAdded
				}
				const notificationService = new Expo()

				if (usersAdded.length > 0) {
					await oneSignalClient.createNotification(notification)
				}
				
				let chunks = notificationService.chunkPushNotifications(messages);
				for (let chunk of chunks) {
					try {
						await notificationService.sendPushNotificationsAsync(chunk);
					} catch (e) {
						console.error(e);
					}
				}

				if (moderators && moderators.length !== 0) {
					const subtitle = 'Your role has been updated.'
					const title = name + ' - Added as moderator'
					const messages: any[] = []
					const activity1: any[] = []
					const moderatorsAdded = await UserModel.find({ _id: { $in: moderators } })
					moderatorsAdded.map((sub) => {
						const notificationIds = sub.notificationId.split('-BREAK-')
						notificationIds.map((notifId: any) => {
							if (!Expo.isExpoPushToken(notifId)) {
								return
							}
							messages.push({
								to: notifId,
								sound: 'default',
								subtitle: subtitle,
								title: title,
								body: '',
								data: { userId: sub._id },
							})
						})
						activity1.push({
							userId: sub._id,
							subtitle,
							title: 'Added as moderator',
							status: 'unread',
							date: new Date(),
							channelId: channel._id,
							target: "CHANNEL_MODERATOR_ADDED"
						})
					})
					await ActivityModel.insertMany(activity1)

					const oneSignalClient = new OneSignal.Client(
						'78cd253e-262d-4517-a710-8719abf3ee55',
						'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
					);
					const notification = {
						contents: {
							'en': title,
						},
						include_external_user_ids: [...moderators]
					}
					const notificationService = new Expo()
					if (moderators.length > 0) {
						await oneSignalClient.createNotification(notification)
					}
					let chunks = notificationService.chunkPushNotifications(messages);
					for (let chunk of chunks) {
						try {
							await notificationService.sendPushNotificationsAsync(chunk);
						} catch (e) {
							console.error(e);
						}
					}
				}

				return 'created'

			} else {
				return 'invalid-name'
			}
		} catch (e) {
			console.log(e)
			return 'error'
		}
	}

	// @Field(type => String, {
	// 	description: 'Used when you want to create a channel.'
	// })
	// public async createChannelFromAdmin(
	// 	@Arg('name', type => String) name: string,
	// 	@Arg('createdBy', type => String) createdBy: string,
	// 	@Arg('password', type => String,  { nullable: true }) password?: string,
	// 	@Arg('temporary', type => Boolean, { nullable: true }) temporary?: boolean,
	// 	@Arg('colorCode', type => String, { nullable: true }) colorCode?: string,
	// 	@Arg('description', type => String, { nullable: true }) description?: string,
	// 	@Arg('tags', type => [String], { nullable: true }) tags?: string[],
	// 	@Arg('isPublic', type => Boolean, { nullable: true }) isPublic?: boolean
	// ) {

	// }

	@Field(type => String, {
		description: 'Reset access code.'
	})
	public async resetAccessCode(
		@Arg('channelId', type => String) channelId: string,
	) {
		

		try {
			const newCode = shortid.generate()

			await ChannelModel.updateOne({
				_id: channelId
			}, {
				accessCode: newCode
			})

			return newCode;
			
		} catch (e) {
			return ""
		}
	}

	@Field(type => String, {
		description: 'Used when you want to create a channel.'
	})
	public async duplicate(
		@Arg('channelId', type => String) channelId: string,
		@Arg('name', type => String) name: string,
		@Arg('password', { nullable: true }) password?: string,
		@Arg('temporary', { nullable: true }) temporary?: boolean,
		@Arg('colorCode', { nullable: true }) colorCode?: string,
		@Arg('duplicateSubscribers', { nullable: true }) duplicateSubscribers?: boolean,
		@Arg('duplicateOwners', { nullable: true }) duplicateOwners?: boolean,
	) {
		try {
			// name should be valid
			if (name
				&& name.toString().trim() !== ''
				&& name.toString().trim() !== 'All'
				&& name.toString().trim() !== 'All-Channels' 
				&& name.toString().trim().toLowerCase() !== 'home'
				&& name.toString().trim().toLowerCase() !== 'cues'
				&& name.toString().trim().toLowerCase() !== 'my notes'
			) {
				// Fetch current channel
				const channel = await ChannelModel.findById(channelId);

				if (!channel) return 'error';

				// Duplicate channel
				const duplicateChannel = await ChannelModel.create({
					name: name.toString().trim(),
					password,
					createdBy: channel.createdBy,
					temporary: channel.temporary ? channel.temporary : false,
					colorCode,
					schoolId: channel.schoolId ? channel.schoolId : null,
					accessCode: shortid.generate(),
				})

				// Subscribe creator to Channel
				await SubscriptionModel.create({
					userId: channel.createdBy,
					channelId: duplicateChannel._id
				})

				// Create all the cues with this channel ID and modifications for the channel owner 
				let channelCues = await CueModel.find({
					channelId
				})

				for (let i = 0; i < channelCues.length; i++) {
					const cueObject = channelCues[i].toObject()
					const duplicate = { ...cueObject }
					delete duplicate._id
					// delete duplicate.deletedAt
					delete duplicate.__v
					duplicate.channelId = duplicateChannel._id;

					await CueModel.create(duplicate)
				}

				// Fetch new Cues
				let duplicateChannelCues = await CueModel.find({
					channelId: duplicateChannel._id
				})

				// Create modifications (Set user id to channel createdBy and channelId to new channel)
				duplicateChannelCues.map(async (cue: any) => {
					const cueObject = cue.toObject()
					const duplicate = { ...cueObject }
					delete duplicate._id
					delete duplicate.deletedAt
					delete duplicate.__v
					duplicate.cueId = cue._id
					duplicate.cue = ''
					duplicate.userId = channel.createdBy
					duplicate.score = 0;
					duplicate.graded = false;
					const u = await ModificationsModel.create(duplicate)
				})

				// Update channel Cues to cues with no limited shares
				duplicateChannelCues = await CueModel.find({ channelId: duplicateChannel._id, limitedShares: { $ne: true } })

				// Subscriber all Users if duplicateSubscribers
				if (duplicateSubscribers) {
					const subscriptions = await SubscriptionModel.find({
						channelId,
						unsubscribedAt: { $exists: false }
					})

					const subscriberIds: any[] = [];

					for (let i = 0; i < subscriptions.length; i++) {
						const sub = subscriptions[i];

						if (sub.userId.toString() === channel.createdBy.toString()) {
							continue;
						}

						await SubscriptionModel.create({
							userId: sub.userId,
							channelId: duplicateChannel._id
						})

						subscriberIds.push(sub.userId);

						// Copy cues and modifications for the subscribers

						duplicateChannelCues.map(async (cue: any) => {
							const cueObject = cue.toObject()
							const duplicate = { ...cueObject }
							delete duplicate._id
							delete duplicate.deletedAt
							delete duplicate.__v
							duplicate.cueId = cue._id
							duplicate.cue = ''
							duplicate.userId = sub.userId
							duplicate.score = 0;
							duplicate.graded = false;
							const u = await ModificationsModel.create(duplicate)
						})

					}

					const subscribersAdded = await UserModel.find({ _id: { $in: subscriberIds } });
					const subtitle = 'You have been added to the course.'
					const title = duplicateChannel.name + ' - Subscribed!'
					const messages: any[] = []
					const activity: any[] = []

					for (let i = 0; i < subscribersAdded.length; i++) {
						const sub = subscribersAdded[i]
						const notificationIds = sub.notificationId.split('-BREAK-')
						notificationIds.map((notifId: any) => {
							if (!Expo.isExpoPushToken(notifId)) {
								return
							}
							messages.push({
								to: notifId,
								sound: 'default',
								subtitle: subtitle,
								title: title,
								body: '',
								data: { userId: sub._id },
							})
						})
						activity.push({
							userId: sub._id,
							subtitle,
							title: 'Subscribed',
							status: 'unread',
							date: new Date(),
							channelId: duplicateChannel._id,
							target: 'CHANNEL_SUBSCRIBED'
						})
					}

					await ActivityModel.insertMany(activity)
					const oneSignalClient = new OneSignal.Client(
						'78cd253e-262d-4517-a710-8719abf3ee55',
						'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
					);
					const notification = {
						contents: {
							'en': title,
						},
						include_external_user_ids: subscriberIds
					}

					const notificationService = new Expo()

					if (subscriberIds.length > 0) {
						await oneSignalClient.createNotification(notification)
					}
					
					let chunks = notificationService.chunkPushNotifications(messages);
					for (let chunk of chunks) {
						try {
							await notificationService.sendPushNotificationsAsync(chunk);
						} catch (e) {
							console.error(e);
						}
					}

				}

				// If Duplicate Owners but not duplicate subscribers, then subscribe the owners
				if (!duplicateSubscribers && duplicateOwners) {
					const subscriptions = await SubscriptionModel.find({
						channelId,
						unsubscribedAt: { $exists: false }
					})

					let ownerSubscriptions = subscriptions.filter((sub: any) => channel.owners && channel.owners.includes(sub.userId.toString()))

					const subscriberIds: any[] = [];

					for (let i = 0; i < ownerSubscriptions.length; i++) {
						const sub = ownerSubscriptions[i];

						if (sub.userId.toString() === channel.createdBy.toString()) {
							continue;
						}

						await SubscriptionModel.create({
							userId: sub.userId,
							channelId: duplicateChannel._id
						})

						// Add activity and send notification
						subscriberIds.push(sub.userId);

						// Copy cues and modifications for the subscribers
						duplicateChannelCues.map(async (cue: any) => {
							const cueObject = cue.toObject()
							const duplicate = { ...cueObject }
							delete duplicate._id
							delete duplicate.deletedAt
							delete duplicate.__v
							duplicate.cueId = cue._id
							duplicate.cue = ''
							duplicate.userId = sub.userId
							duplicate.score = 0;
							duplicate.graded = false;
							const u = await ModificationsModel.create(duplicate)
						})
					}


					const subscribersAdded = await UserModel.find({ _id: { $in: subscriberIds } });
					const subtitle = 'You have been added to the course.'
					const title = duplicateChannel.name + ' - Subscribed!'
					const messages: any[] = []
					const activity: any[] = []

					for (let i = 0; i < subscribersAdded.length; i++) {
						const sub = subscribersAdded[i];

						const notificationIds = sub.notificationId.split('-BREAK-')
						notificationIds.map((notifId: any) => {
							if (!Expo.isExpoPushToken(notifId)) {
								return
							}
							messages.push({
								to: notifId,
								sound: 'default',
								subtitle: subtitle,
								title: title,
								body: '',
								data: { userId: sub._id },
							})
						})
						activity.push({
							userId: sub._id,
							subtitle,
							title: 'Subscribed',
							status: 'unread',
							date: new Date(),
							channelId: duplicateChannel._id,
							target: "CHANNEL_SUBSCRIBED"
						})
					}

					await ActivityModel.insertMany(activity)
					const oneSignalClient = new OneSignal.Client(
						'78cd253e-262d-4517-a710-8719abf3ee55',
						'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
					);
					const notification = {
						contents: {
							'en': title,
						},
						include_external_user_ids: subscriberIds
					}
					const notificationService = new Expo()

					if (subscriberIds.length > 0) {
						await oneSignalClient.createNotification(notification)
					}
					
					let chunks = notificationService.chunkPushNotifications(messages);
					for (let chunk of chunks) {
						try {
							await notificationService.sendPushNotificationsAsync(chunk);
						} catch (e) {
							console.error(e);
						}
					}

				}

				// Next add the moderators as channel owners

				if (duplicateOwners && channel.owners && channel.owners.length > 0) {

					// Update owners property for duplicate Channel
					await ChannelModel.updateOne({
						_id: duplicateChannel._id
					}, {
						owners: channel.owners
					})

					const ownerIds: any[] = [];

					if (!channel.owners) return;

					for (let i = 0; i < channel.owners.length; i++) {

						const owner = channel.owners[i];
						// Ensure channel createdBy is not part of the owners array
						if (owner.toString() === channel.createdBy.toString()) {
							continue;
						}

						ownerIds.push(owner);
					}


					const ownersAdded = await UserModel.find({ _id: { $in: ownerIds } });
					const subtitle = 'Your role has been updated.'
					const title = name + ' - Added as moderator'
					const messages: any[] = []
					const activity1: any[] = []

					ownersAdded.map((sub) => {
						const notificationIds = sub.notificationId.split('-BREAK-')
						notificationIds.map((notifId: any) => {
							if (!Expo.isExpoPushToken(notifId)) {
								return
							}
							messages.push({
								to: notifId,
								sound: 'default',
								subtitle: subtitle,
								title: title,
								body: '',
								data: { userId: sub._id },
							})
						})
						activity1.push({
							userId: sub._id,
							subtitle,
							title: 'Added as moderator',
							status: 'unread',
							date: new Date(),
							channelId: duplicateChannel._id,
							target: "CHANNEL_MODERATOR_ADDED"
						})
					})
					await ActivityModel.insertMany(activity1)

					const oneSignalClient = new OneSignal.Client(
						'78cd253e-262d-4517-a710-8719abf3ee55',
						'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
					);
					const notification = {
						contents: {
							'en': title,
						},
						include_external_user_ids: ownerIds
					}
					const notificationService = new Expo()
					if (ownerIds.length > 0) {
						await oneSignalClient.createNotification(notification)
					}
					let chunks = notificationService.chunkPushNotifications(messages);
					for (let chunk of chunks) {
						try {
							await notificationService.sendPushNotificationsAsync(chunk);
						} catch (e) {
							console.error(e);
						}
					}
				}

				// Next copy all the content with modifications and statuses

				return 'created'

			} else {
				return 'invalid-name'
			}
		} catch (e) {
			console.log(e)
			return 'error'
		}
	}

	@Field(type => AddUsersEmailObject, {
		description: 'Add users by email to course and organization'
	}) 
	public async addUsersByEmail(
		@Arg('channelId', type => String) channelId: string,
		@Arg('userId', type => String) userId: string,
		@Arg('emails', type => [String]) emails: string[],
	) {
		try {

			const fetchCourse = await ChannelModel.findOne({
				_id: channelId,
			})

			let isOwner = false;
	
			if (!fetchCourse || !fetchCourse._id) {
				return {
					success: [],
					failed: [],
					error: 'No Course found'
				};
			} 

			// Ensure the userId is the course creator or a moderator of the course
			
			if (fetchCourse.createdBy.toString() === userId) {
				isOwner = true;
			} 

			if (fetchCourse.owners && fetchCourse.owners.length > 0 && fetchCourse.owners.includes(userId)) {
				isOwner = true;
			}

			if (!isOwner) {
				return {
					success: [],
					failed: [],
					error: 'You are not authorized to add users to this course.'
				};
			}

			const fetchInstructor = await UserModel.findOne({
				_id: userId
			})

			if (!fetchInstructor || !fetchInstructor._id) {
				return {
					success: [],
					failed: [],
					error: 'Invalid user id'
				};
			} 

			console.log("Course", fetchCourse)
	
			let failed: string[] = []
			let success: string[] = []
	
			const addedStudentActivities: any[] = []
			let addedPasswords: any = {}

			const emailSet = new Set(emails)
	
			// Step 4: Create student accounts
			for (const studentEmail of emailSet) {
				// Create account for student
				let student: any = {}
	
				const email = studentEmail.toLowerCase().trim()
	
				const existingStudent = await UserModel.findOne({
					email
				})
	
				if (existingStudent && existingStudent._id) {
					// Existing user found but part of different org
					if (existingStudent.schoolId && fetchInstructor.schoolId && existingStudent.schoolId?.toString()  !== fetchInstructor?.schoolId.toString()) {
						// In a different org
						failed.push(email);
						continue;
					} else {
						student = existingStudent
	
						UserModel.updateOne({
							_id: student._id
						}, {
							schoolId: fetchInstructor.schoolId
						})
					} 
	
				} else {
	
					let name = studentEmail.toLowerCase().trim().split('@')[0]

					const randomInt = Math.floor(Math.random() * 9999)
	
					// Generate a password and hash it 
					const password = name + '@' + randomInt.toString() 
	
					const hash = await hashPassword(password)
	
					student = await UserModel.create({
						email,
						fullName: name,
						displayName: name,
						notificationId: 'NOT_SET',
						password: hash,
						schoolId: fetchInstructor.schoolId,
						role: 'student'
					})
	
					if (!student || !student._id) {
						failed.push(email)
						continue
					}
		
					addedPasswords[email] = password

					console.log("Student", student)            
				}

				// Check if subscription exists
				const existingSub = await SubscriptionModel.findOne({
					userId: student._id,
					channel: fetchCourse._id,
					unsubscribedAt: { $exists: false }
				})

				if (existingSub && existingSub._id) {
					success.push(email)
					continue;
				}
	
				// Subscribe the student to the course 
				const sub = await SubscriptionModel.create({
					userId: student._id,
					channelId: fetchCourse._id,
				})
	
				console.log("New Sub", sub)
				
				if (sub && sub._id) {
					addedStudentActivities.push({
						userId: student._id,
						subtitle: 'You have been added to the course.',
						title: 'Subscribed',
						status: 'unread',
						date: new Date(),
						channelId: fetchCourse._id,
						target: 'CHANNEL_SUBSCRIBED'
					})
	
					success.push(email)
				} else {
					failed.push(email)
				}
	
			}
	
			console.log("Success", success)
	
			console.log("Failed", failed)
	
			const subscribeActivites = ActivityModel.insertMany(addedStudentActivities)

			for (const student_email of Object.keys(addedPasswords)) {

				const name = student_email.split('@')[0];
				
				const student_password = addedPasswords[student_email]
	
				const emailService = new EmailService()
	
				emailService.sendWelcomeEmailStudent(name, student_email, fetchCourse.name, student_password, fetchInstructor.fullName)
	
			}

			// Return 
			return {
				success,
				failed,
				error: ''
			}

		} catch (e) {
			return {
				success: [],
				failed: [],
				error: 'Something went wrong. Try again.'
			}
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
			const vdoURL = 'https://my2.vdo.click/bigbluebutton/api/'
			const vdoKey = 'KgX9F6EE0agJzRSU9DVDh5wc2U4OvtGJ0mtJHfh97YU'
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

					const oneSignalClient = new OneSignal.Client(
						'78cd253e-262d-4517-a710-8719abf3ee55',
						'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
					);


					const notification = {
						contents: {
							'en': 'The host is now in the meeting! - ' + channel.name,
						},
						include_external_user_ids: userIds
					}

					if (userIds.length > 0) {
						const response = await oneSignalClient.createNotification(notification)
					} 

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

	// ZOOM
	@Field(type => String, {
		description: 'Used when you want to create/join a meeting.'
	})
	public async startInstantMeeting(
		@Arg('channelId', type => String) channelId: string,
		@Arg('userId', type => String) userId: string,
		@Arg('title', type => String) title: string,
		@Arg('description', type => String) description: string,
		@Arg('start', type => String) start: string,
		@Arg('end', type => String) end: string,
		@Arg('notifyUsers', type => Boolean) notifyUsers: boolean
	) {
		try {

			const diff = Math.abs(new Date(start).getTime() - new Date(end).getTime());

            const duration = Math.round(diff / 60000);
			
			let accessToken = ''
			const u: any = await UserModel.findById(userId);
			const c: any = await ChannelModel.findById(channelId);
			if (u && c) {

				const user = u.toObject();
				const channel = c.toObject();

				let useZoom = true;

				if (user.schoolId && user.schoolId !== '') {
					const org = await SchoolsModel.findById(user.schoolId);

					if (org && org.meetingProvider && org.meetingProvider !== '') {
						useZoom = false;
					}
				}
				

				if (useZoom) {

					
					if (!user.zoomInfo) {
						return 'error'
					} else {
						accessToken = user.zoomInfo.accessToken
					}

					const b = Buffer.from(zoomClientId + ":" + zoomClientSecret);

					const date = new Date()
					const expiresOn = new Date(user.zoomInfo.expiresOn)

					if (expiresOn <= date) {
						// refresh access token

						const zoomRes: any = await axios.post(
							`https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${user.zoomInfo.refreshToken}`, undefined, {
							headers: {
								Authorization: `Basic ${b.toString("base64")}`,
								"Content-Type": 'application/x-www-form-urlencoded'
							},
						});
						
						if (zoomRes.status !== 200) {
							return 'error'
						}

						const zoomData: any = zoomRes.data

						const eOn = new Date()
						eOn.setSeconds(eOn.getSeconds() + (Number.isNaN(Number(zoomData.expires_in)) ? 0 : Number(zoomData.expires_in)))

						accessToken = zoomData.access_token

						await UserModel.updateOne({ _id: userId }, {
							zoomInfo: {
								...user.zoomInfo,
								accessToken: zoomData.access_token,
								refreshToken: zoomData.refresh_token,
								expiresOn: eOn	// saved as a date
							}
						})

					}

					let owner = true
					if (channel.owners) {
						channel.owners.map((uId: any) => {
							if (uId.toString().trim() === userId.toString().trim()) {
								owner = true
							}
						})
					}
					if (channel.createdBy.toString().trim() === userId.toString().trim()) {
						owner = true
					}

					if (!owner) {
						// meeting not started
						return 'error'
					} else {

						// CREATE MEETING
						const utcTime = moment(new Date(start), 'YYYY-MM-DDTHH:mm:ss')
						.tz('UTC')
						.format();

						// create meeting
						const zoomRes: any = await axios.post(
							`https://api.zoom.us/v2/users/me/meetings`,
							{
								topic: channel.name + '- ' + title,
								agenda: description,
								type: 2,
								start_time: utcTime + 'Z',
								duration
							}, {
							headers: {
								Authorization: `Bearer ${accessToken}`,
							},
						});

						if (zoomRes.status !== 200 && zoomRes.status !== 201) {
							return 'error'
						}

						const zoomData: any = zoomRes.data

						if (zoomData.id) {

							// Create a new Date 
							await DateModel.create({
								userId,
								title,
								start: new Date(start),
								end: new Date(end),
								isNonMeetingChannelEvent: undefined,
								scheduledMeetingForChannelId: channelId,
								description,
								zoomMeetingId: zoomData.id,
								zoomStartUrl: zoomData.start_url,
								zoomJoinUrl: zoomData.join_url,
								zoomMeetingScheduledBy: userId,
								recordMeeting: true
							});

						} else {
							return 'error'

						}

						if (notifyUsers) {

							const subscriptions = await SubscriptionModel.find({
								channelId,
								unsubscribedAt: { $exists: false }
							})

							const subscriberIds = subscriptions.map((sub: any) => sub.userId);

							// Alert all the users in the channel
							const userDocs = await UserModel.find({ _id: { $in: subscriberIds } })
							let title = channel.name + '- New meeting started'
							let messages: any[] = []

							// Web notifications
							const oneSignalClient = new OneSignal.Client(
								'78cd253e-262d-4517-a710-8719abf3ee55',
								'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
							);
							const notification = {
								contents: {
									'en': channel.name + ' - New meeting started.'
								},
								include_external_user_ids: subscriberIds
							}

							if (subscriberIds.length > 0) {
								const response = await oneSignalClient.createNotification(notification)
							} 
							
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
										subtitle: '',
										title,
										data: { userId: sub._id },
									})
								})
							})
							const notificationService = new Expo()
							let chunks = notificationService.chunkPushNotifications(messages);
							for (let chunk of chunks) {
								try {
									await notificationService.sendPushNotificationsAsync(chunk);
								} catch (e) {
									console.error(e);
								}
							}

						}

						return zoomData.start_url
					}

				} else {

					let owner = true
					if (channel.owners) {
						channel.owners.map((uId: any) => {
							if (uId.toString().trim() === userId.toString().trim()) {
								owner = true
							}
						})
					}
					if (channel.createdBy.toString().trim() === userId.toString().trim()) {
						owner = true
					}

					if (!owner) {
						// meeting not started
						return 'error'
					} else {

						// CHECK IF MEETING LINK HAS BEEN SET FOR THE COURSE

						if (!channel.meetingUrl || channel.meetingUrl === '') {
							return 'MEETING_LINK_NOT_SET'
						}

						// CREATE MEETING
						await DateModel.create({
							userId,
							title,
							start: new Date(start),
							end: new Date(end),
							isNonMeetingChannelEvent: undefined,
							scheduledMeetingForChannelId: channelId,
							description,
							recordMeeting: true
						});

						if (notifyUsers) {

							const subscriptions = await SubscriptionModel.find({
								channelId,
								unsubscribedAt: { $exists: false }
							})

							const subscriberIds = subscriptions.map((sub: any) => sub.userId);

							// Alert all the users in the channel
							const userDocs = await UserModel.find({ _id: { $in: subscriberIds } })
							let title = channel.name + '- New meeting started'
							let messages: any[] = []

							// Web notifications
							const oneSignalClient = new OneSignal.Client(
								'78cd253e-262d-4517-a710-8719abf3ee55',
								'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
							);
							const notification = {
								contents: {
									'en': channel.name + ' - New meeting started.'
								},
								include_external_user_ids: subscriberIds
							}

							if (subscriberIds.length > 0) {
								const response = await oneSignalClient.createNotification(notification)
							} 
							
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
										subtitle: '',
										title,
										data: { userId: sub._id },
									})
								})
							})
							const notificationService = new Expo()
							let chunks = notificationService.chunkPushNotifications(messages);
							for (let chunk of chunks) {
								try {
									await notificationService.sendPushNotificationsAsync(chunk);
								} catch (e) {
									console.error(e);
								}
							}

						}

						return channel.meetingUrl
					}

				}


			} 
			return 'error'
		} catch (e) {
			console.log(e)
			return 'error'
		}
	}

	// @Field(type => String, {
	// 	description: 'Used when you want to create/join a meeting.'
	// })
	// public async meetingRequest(
	// 	@Arg('channelId', type => String) channelId: string,
	// 	@Arg('isOwner', type => Boolean) isOwner: boolean,
	// 	@Arg('userId', type => String) userId: string
	// ) {
	// 	try {

	// 		let accessToken = ''
	// 		const u: any = await UserModel.findById(userId);
	// 		const c: any = await ChannelModel.findById(channelId);
	// 		if (u && c) {
	// 			const user = u.toObject();
	// 			const channel = c.toObject();

	// 			// check started
	// 			if (channel.meetingOn) {
	// 				// return join URL
	// 				return channel.joinUrl ? channel.joinUrl : '/'
	// 			} else {


	// 				// refresh access token
	// 				if (!user.zoomInfo) {
	// 					return 'error'
	// 				} else {
	// 					accessToken = user.zoomInfo.accessToken
	// 				}

	// 				// LIVE
	// 				// const clientId = 'yRzKFwGRTq8bNKLQojwnA'
	// 				// const clientSecret = 'cdvpIvYRsubUFTOfXbrlnjnnWM3nPWFm'
	// 				// DEV
	// 				const clientId = 'PAfnxrFcSd2HkGnn9Yq96A'
	// 				const clientSecret = '43LWA5ysjiN1xykRiS32krS9Nx8xGhYt'

	// 				const b = Buffer.from(clientId + ":" + clientSecret);

	// 				const date = new Date()
	// 				const expiresOn = new Date(user.zoomInfo.expiresOn)

	// 				if (expiresOn <= date) {
	// 					// refresh access token

	// 					const zoomRes: any = await axios.post(
	// 						`https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${user.zoomInfo.refreshToken}`, undefined, {
	// 						headers: {
	// 							Authorization: `Basic ${b.toString("base64")}`,
	// 							"Content-Type": 'application/x-www-form-urlencoded'
	// 						},
	// 					});
	// 					console.log(zoomRes)
	// 					if (zoomRes.status !== 200) {
	// 						return 'error'
	// 					}

	// 					const zoomData: any = zoomRes.data

	// 					const eOn = new Date()
	// 					eOn.setSeconds(eOn.getSeconds() + (Number.isNaN(Number(zoomData.expires_in)) ? 0 : Number(zoomData.expires_in)))

	// 					accessToken = zoomData.access_token

	// 					await UserModel.updateOne({ _id: userId }, {
	// 						zoomInfo: {
	// 							...user.zoomInfo,
	// 							accessToken: zoomData.access_token,
	// 							refreshToken: zoomData.refresh_token,
	// 							expiresOn: eOn	// saved as a date
	// 						}
	// 					})

	// 				}

	// 				let owner = true
	// 				if (channel.owners) {
	// 					channel.owners.map((uId: any) => {
	// 						if (uId.toString().trim() === userId.toString().trim()) {
	// 							owner = true
	// 						}
	// 					})
	// 				}
	// 				if (channel.createdBy.toString().trim() === userId.toString().trim()) {
	// 					owner = true
	// 				}
	// 				if (!owner) {
	// 					// meeting not started
	// 					return 'error'
	// 				} else {
	// 					// create meeting
	// 					const zoomRes: any = await axios.post(
	// 						`https://api.zoom.us/v2/users/me/meetings`,
	// 						{
	// 							topic: channel.name
	// 						}, {
	// 						headers: {
	// 							Authorization: `Bearer ${accessToken}`,
	// 						},
	// 					});
	// 					console.log(zoomRes)
	// 					if (zoomRes.status !== 200 && zoomRes.status !== 201) {
	// 						return 'error'
	// 					}

	// 					const zoomData: any = zoomRes.data
	// 					await ChannelModel.updateOne(
	// 						{ _id: channelId }, {
	// 						startUrl: zoomData.start_url,
	// 						joinUrl: zoomData.join_url,
	// 						startedBy: userId
	// 					})

	// 					return zoomData.start_url
	// 				}
	// 			}

	// 			// const sha1 = require("sha1");
	// 			// const axios = require('axios')
	// 			// const vdoURL = "https://my2.vdo.click/bigbluebutton/api/";
	// 			// const vdoKey = "KgX9F6EE0agJzRSU9DVDh5wc2U4OvtGJ0mtJHfh97YU";
	// 			// const atendeePass = channelId;
	// 			// const modPass = channel.createdBy;

	// 			// const lastRecordedMeetingId = channelId
	// 			// let createMeeting = true
	// 			// // check if meeting is in session
	// 			// const linkParams = "meetingID=" + lastRecordedMeetingId
	// 			// const Hash = "isMeetingRunning" + linkParams + vdoKey;
	// 			// const Checksum = sha1(Hash);
	// 			// const res = await axios.get(vdoURL + 'isMeetingRunning?' + linkParams + '&checksum=' + Checksum)
	// 			// const xml2js = require('xml2js');
	// 			// const parser = new xml2js.Parser();
	// 			// const json = await parser.parseStringPromise(res.data);
	// 			// if (json.response && json.response.returncode && json.response.returncode[0] === 'SUCCESS') {
	// 			// 	const running = json.response.running[0]
	// 			// 	if (running === 'true') {
	// 			// 		createMeeting = false
	// 			// 	}
	// 			// }

	// 			// if (createMeeting) {
	// 			// 	// create meeting only if not owner
	// 			// 	if (!isOwner) {
	// 			// 		return 'error'
	// 			// 	}

	// 			// 	const fullName = encodeURI(encodeURIComponent(channel.name.replace(/[^a-z0-9]/gi, '').split(' ').join('').trim()))
	// 			// 	const params =
	// 			// 		'allowStartStopRecording=true' +
	// 			// 		'&attendeePW=' + atendeePass +
	// 			// 		'&autoStartRecording=false' +
	// 			// 		'&meetingID=' + channelId +
	// 			// 		'&moderatorPW=' + modPass +
	// 			// 		'&name=' + (fullName.length > 0 ? fullName : Math.floor(Math.random() * (999 - 100 + 1) + 100).toString()) +
	// 			// 		'&record=true'
	// 			// 	const toHash = (
	// 			// 		'create' + params + vdoKey
	// 			// 	)
	// 			// 	const checkSum = sha1(toHash)
	// 			// 	const url = vdoURL + 'create?' + params + '&checksum=' + checkSum

	// 			// 	axios.get(url).then(async (res: any) => {

	// 			// 		const xml2js = require('xml2js');
	// 			// 		const parser = new xml2js.Parser();
	// 			// 		const json = await parser.parseStringPromise(res.data);

	// 			// 		if (json.response && json.response.returncode && json.response.returncode[0] === 'SUCCESS') {
	// 			// 			const meetingId = json.response.meetingID[0]
	// 			// 			await ChannelModel.updateOne({ _id: channelId }, { lastRecordedMeetingId: meetingId })
	// 			// 		}

	// 			// 		const subscribers = await SubscriptionModel.find({ channelId, unsubscribedAt: { $exists: false } })
	// 			// 		const userIds: any[] = []
	// 			// 		const messages: any[] = []
	// 			// 		const notificationService = new Expo()
	// 			// 		subscribers.map(u => {
	// 			// 			userIds.push(u.userId)
	// 			// 		})

	// 			// 		// Web notifications
	// 			// 		const oneSignalClient = new OneSignal.Client(
					// 	'78cd253e-262d-4517-a710-8719abf3ee55',
					// 	'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
					// );
	// 			// 		const notification = {
	// 			// 			contents: {
	// 			// 				'en': 'The host is now in the meeting! - ' + channel.name,
	// 			// 			},
	// 			// 			include_external_user_ids: userIds
	// 			// 		}

	// 			// 		const response = await oneSignalClient.createNotification(notification)
	// 			// 		const users = await UserModel.find({ _id: { $in: userIds } })
	// 			// 		users.map(sub => {
	// 			// 			const notificationIds = sub.notificationId.split('-BREAK-')
	// 			// 			notificationIds.map((notifId: any) => {
	// 			// 				if (!Expo.isExpoPushToken(notifId)) {
	// 			// 					return
	// 			// 				}
	// 			// 				messages.push({
	// 			// 					to: notifId,
	// 			// 					sound: 'default',
	// 			// 					subtitle: 'The host is now in the meeting!',
	// 			// 					title: channel.name + ' - Meeting Started',
	// 			// 					data: { userId: sub._id },
	// 			// 				})
	// 			// 			})
	// 			// 		})
	// 			// 		let chunks = notificationService.chunkPushNotifications(messages);
	// 			// 		for (let chunk of chunks) {
	// 			// 			try {
	// 			// 				await notificationService.sendPushNotificationsAsync(chunk);
	// 			// 			} catch (e) {
	// 			// 				console.error(e);
	// 			// 			}
	// 			// 		}
	// 			// 	}).catch((err: any) => {
	// 			// 		console.log(err);
	// 			// 	})

	// 			// }

	// 			// const fullName = encodeURIComponent(encodeURI(user.displayName.replace(/[^a-z0-9]/gi, '').split(' ').join('').trim()))
	// 			// const params =
	// 			// 	"fullName=" +
	// 			// 	(fullName.length > 0 ? fullName : Math.floor(Math.random() * (999 - 100 + 1) + 100).toString()) +
	// 			// 	"&meetingID=" +
	// 			// 	channelId +
	// 			// 	"&password=" +
	// 			// 	(channel.createdBy.toString().trim() ===
	// 			// 		user._id.toString().trim()
	// 			// 		? modPass
	// 			// 		: atendeePass);
	// 			// const toHash = "join" + params + vdoKey;
	// 			// const checksum = sha1(toHash);

	// 			// return vdoURL + "join?" + params + "&checksum=" + checksum;
	// 		}
	// 		return 'error'
	// 	} catch (e) {
	// 		console.log(e)
	// 		return 'error'
	// 	}
	// }

	@Field(type => String, {
		description: 'Used when you want to allow or disallow people from joining meeting.'
	})
	public async personalMeetingRequest(
		@Arg('channelId', type => String) channelId: string,
		@Arg('userId', type => String) userId: string,
		@Arg('users', type => [String]) users: string[],
	) {
		try {

			const c: any = await ChannelModel.findById(channelId);
			const u: any = await UserModel.findById(userId)
			if (c && u) {
				const channel = c.toObject();
				const user = u.toObject()

				const sha1 = require("sha1");
				const axios = require('axios')
				const vdoURL = "https://my2.vdo.click/bigbluebutton/api/";
				const vdoKey = "KgX9F6EE0agJzRSU9DVDh5wc2U4OvtGJ0mtJHfh97YU";
				const atendeePass = channelId;
				const modPass = channel.createdBy;

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

				const lastRecordedMeetingId = groupId
				let createMeeting = true

				const linkParams = "meetingID=" + lastRecordedMeetingId
				const Hash = "isMeetingRunning" + linkParams + vdoKey;
				const Checksum = sha1(Hash);
				const res = await axios.get(vdoURL + 'isMeetingRunning?' + linkParams + '&checksum=' + Checksum)
				const xml2js = require('xml2js');
				const parser = new xml2js.Parser();
				const json = await parser.parseStringPromise(res.data);
				if (json.response && json.response.returncode && json.response.returncode[0] === 'SUCCESS') {
					const running = json.response.running[0]
					if (running === 'true') {
						createMeeting = false
					}
				}

				if (createMeeting) {

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
						const oneSignalClient = new OneSignal.Client(
							'78cd253e-262d-4517-a710-8719abf3ee55',
							'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
						);
						const notification = {
							contents: {
								'en': channel.name + ' - Private meeting initiated with ' + participantNames
							},
							include_external_user_ids: users
						}

						if (users.length > 0) {
							const response = await oneSignalClient.createNotification(notification)
						}
						
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

				const fullName = encodeURIComponent(encodeURI(user.displayName.replace(/[^a-z0-9]/gi, '').split(' ').join('').trim()))
				const params =
					"fullName=" +
					(fullName.length > 0 ? fullName : Math.floor(Math.random() * (999 - 100 + 1) + 100).toString()) +
					"&meetingID=" +
					groupId +
					"&password=" + groupId
				const toHash = "join" + params + vdoKey;
				const checksum = sha1(toHash);
				return vdoURL + "join?" + params + "&checksum=" + checksum;

			}
			return 'error'
		} catch (e) {
			return 'error'
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
			const vdoURL = 'https://my2.vdo.click/bigbluebutton/api/'
			const vdoKey = 'KgX9F6EE0agJzRSU9DVDh5wc2U4OvtGJ0mtJHfh97YU'

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
					const oneSignalClient = new OneSignal.Client(
						'78cd253e-262d-4517-a710-8719abf3ee55',
						'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
					);
					const notification = {
						contents: {
							'en': channel.name + ' - Private meeting initiated with ' + participantNames
						},
						include_external_user_ids: users
					}

					if (users.length > 0) {
						const response = await oneSignalClient.createNotification(notification)
					}
					
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
		description: 'Delete channel id'
	})
	public async deleteById(
		@Arg('channelId', type => String) channelId: string,
	) {
		const channel = await ChannelModel.findById(channelId);

		if (!channel) return false;

		try {

			// Delete subscriptions
			// await SubscriptionModel.deleteMany({
			// 	channelId
			// })

			// First 

			await SubscriptionModel.updateMany({
				channelId
			}, {
				unsubscribedAt: new Date(),
				keepContent: true
			})

			// Delete all channel related stuff too
			await ActivityModel.deleteMany({
				channelId
			})


			await ChannelModel.updateOne({
				_id: channelId
			}, {
				deletedAt: new Date(),
				creatorUnsubscribed: true
			})

			return true;

		} catch (e) {

			return false;

		}


	}

	@Field(type => Boolean, {
		description: 'Used to check if a SIS ID is already assigned to a course'
	})
	public async checkSisIdInUse(
		@Arg('schoolId', type => String) schoolId: string,
		@Arg('sisId', type => String) sisId: string,
	) {
		const existingChannel = await ChannelModel.findOne({
			schoolId,
			sisId
		})

		return existingChannel && existingChannel._id !== '' ? true : false
	}

	@Field(type => Boolean, {
		description: 'Used when owner wants to set up new password.'
	})
	public async update(
		@Arg('channelId', type => String) channelId: string,
		@Arg('name', type => String) name: string,
		@Arg('owners', type => [String]) owners: string[],
		@Arg('password', type => String, { nullable: true }) password?: string,
		@Arg('temporary', type => Boolean, { nullable: true }) temporary?: boolean,
		@Arg('colorCode', type => String, { nullable: true }) colorCode?: string,
		@Arg('description', type => String, { nullable: true }) description?: string,
		@Arg('tags', type => [String], { nullable: true }) tags?: string[],
		@Arg('isPublic', type => Boolean, { nullable: true }) isPublic?: boolean,
		@Arg('sisId', type => String, { nullable: true }) sisId?: string,
		@Arg('meetingUrl', type => String, { nullable: true }) meetingUrl?: string
	) {
		try {

			const channel = await ChannelModel.findById(channelId);

			if (!channel) return false;

			const toAdd: any[] = []
			const toRemove: any[] = []
			const oldOwners = channel.owners ? channel.owners : []

			// group old owners
			oldOwners.map((old) => {
				const found = owners.find((o: any) => {
					return o === old
				})
				if (!found) {
					toRemove.push(old)
				}
			})

			// group new owners
			owners.map(newId => {
				const found = oldOwners.find((o: any) => {
					return o === newId
				})
				if (!found) {
					toAdd.push(newId)
				}
			})

			// subscribe new owners
			toAdd.map(async (userId: any) => {
				const sub = await SubscriptionModel.findOne({
					userId,
					channelId: channel._id,
					unsubscribedAt: { $exists: false }
				})
				if (sub) {
					return
				}

				const pastSubs = await SubscriptionModel.find({
					userId,
					channelId: channel._id
				})
				if (pastSubs.length === 0) {
					const channelCues = await CueModel.find({ channelId: channel._id, limitedShares: { $ne: true } })
					channelCues.map(async (cue: any) => {
						const cueObject = cue.toObject()
						const duplicate = { ...cueObject }
						delete duplicate._id
						delete duplicate.deletedAt
						delete duplicate.__v
						duplicate.cueId = cue._id
						duplicate.cue = ''
						duplicate.userId = userId
						duplicate.score = 0;
						duplicate.graded = false
						const u = await ModificationsModel.create(duplicate)
					})
				}

				const threads = await ThreadModel.find({
					channelId: channel._id,
					isPrivate: false
				})
				threads.map(async (t) => {
					const thread = t.toObject()
					await ThreadStatusModel.create({
						userId,
						channelId: channel._id,
						cueId: thread.cueId ? thread.cueId : null,
						threadId: thread.parentId ? thread.parentId : thread._id
					})
				})

				// await SubscriptionModel.updateMany({
				// 	userId,
				// 	channelId: channel._id,
				// 	unsubscribedAt: { $exists: true }
				// }, {
				// 	keepContent: false
				// })
				// subscribe 
				// await SubscriptionModel.create({
				// 	userId, channelId: channel._id
				// })

				// Check if channel owner, if yes then update creatorUnsubscribed: true
				if (channel.createdBy.toString().trim() === userId.toString().trim()) {
					await ChannelModel.updateOne({
						_id: channel._id
					}, {
						creatorUnsubscribed: false
					})
				}
			})

			// Update Channel settings
			await ChannelModel.updateOne(
				{ _id: channelId },
				{
					name,
					password: password && password !== '' ? password : undefined,
					temporary: temporary ? true : false,
					owners,
					colorCode: colorCode ? colorCode : channel.colorCode,
					isPublic: isPublic ? true : false,
					tags: tags ? tags : [],
					description,
					sisId: sisId ? sisId : '',
					meetingUrl: meetingUrl ? meetingUrl : ''
				}
			)


			// Notify added owners

			const subtitle = 'Your role has been updated.'
			const title = name + ' - Added as moderator'
			const messages: any[] = []
			const activity1: any[] = []
			const subscribersAdded = await UserModel.find({ _id: { $in: toAdd } })
			subscribersAdded.map((sub) => {
				const notificationIds = sub.notificationId.split('-BREAK-')
				notificationIds.map((notifId: any) => {
					if (!Expo.isExpoPushToken(notifId)) {
						return
					}
					messages.push({
						to: notifId,
						sound: 'default',
						subtitle: subtitle,
						title: title,
						body: '',
						data: { userId: sub._id },
					})
				})
				activity1.push({
					userId: sub._id,
					subtitle,
					title: 'Added as moderator',
					status: 'unread',
					date: new Date(),
					channelId,
					target: "CHANNEL_MODERATOR_ADDED"
				})
			})
			await ActivityModel.insertMany(activity1)

			const oneSignalClient = new OneSignal.Client(
				'78cd253e-262d-4517-a710-8719abf3ee55',
				'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
			);
			const notification = {
				contents: {
					'en': title,
				},
				include_external_user_ids: [...toAdd]
			}
			const notificationService = new Expo()
			if (toAdd.length > 0) {
				await oneSignalClient.createNotification(notification)
			}
			let chunks = notificationService.chunkPushNotifications(messages);
			for (let chunk of chunks) {
				try {
					await notificationService.sendPushNotificationsAsync(chunk);
				} catch (e) {
					console.error(e);
				}
			}


			const removeSubtitle = 'Your role has been updated.'
			const removeTitle = name + ' - Removed as moderator!'
			const removeMessages: any[] = []
			const activity2: any[] = []

			const subscribersRemoved = await UserModel.find({ _id: { $in: toRemove } })
			subscribersRemoved.map((sub) => {
				const notificationIds = sub.notificationId.split('-BREAK-')
				notificationIds.map((notifId: any) => {
					if (!Expo.isExpoPushToken(notifId)) {
						return
					}
					removeMessages.push({
						to: notifId,
						sound: 'default',
						subtitle: removeSubtitle,
						title: removeTitle,
						body: '',
						data: { userId: sub._id },
					})
				})
				activity2.push({
					userId: sub._id,
					subtitle,
					title: 'Removed as moderator',
					status: 'unread',
					date: new Date(),
					channelId,
					target: "CHANNEL_MODERATOR_REMOVED"
				})
			})
			await ActivityModel.insertMany(activity2)

			const removeNotification = {
				contents: {
					'en': title,
				},
				include_external_user_ids: [...toRemove]
			}
			if (toRemove.length > 0) {
				await oneSignalClient.createNotification(removeNotification)
			}
			let removeChunks = notificationService.chunkPushNotifications(removeMessages);
			for (let chunk of removeChunks) {
				try {
					await notificationService.sendPushNotificationsAsync(chunk);
				} catch (e) {
					console.error(e);
				}
			}

			return true;
		} catch (e) {
			console.log("Channel update error", e)
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
			const vdoURL = 'https://my2.vdo.click/bigbluebutton/api/'
			const vdoKey = 'KgX9F6EE0agJzRSU9DVDh5wc2U4OvtGJ0mtJHfh97YU'
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
