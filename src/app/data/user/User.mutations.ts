import { hashPassword, verifyPassword } from '@app/data/methods';
import { UserModel } from '@app/data/user/mongo/User.model';
import { EmailService } from '../../../emailservice/Postmark';
import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { UserObject } from './types/User.type';
import { SchoolsModel } from '../school/mongo/School.model';
import { ThreadModel } from '../thread/mongo/Thread.model';
import { ThreadStatusModel } from '../thread-status/mongo/thread-status.model';

/**
 * User Mutation Endpoints
 */
@ObjectType()
export class UserMutationResolver {

	@Field(type => UserObject, {
		description: 'Used when you want to create user.',
		nullable: true
	})
	public async create(
		@Arg('fullName', type => String)
		fullName: string,
		@Arg('displayName', type => String)
		displayName: string,
		@Arg('notificationId', type => String)
		notificationId: string
	) {

		try {
			return await UserModel.create({
				fullName,
				notificationId,
				displayName
			})
		} catch (e) {
			console.log(e)
			return null
		}
	}

	@Field(type => Boolean, {
		description: 'Used when you want to update a user.',
		nullable: true
	})
	public async update(
		@Arg('fullName', type => String)
		fullName: string,
		@Arg('displayName', type => String)
		displayName: string,
		@Arg('userId', type => String)
		userId: string
	) {
		try {
			await UserModel.updateOne(
				{ _id: userId },
				{
					fullName,
					displayName
				})
			return true
		} catch (e) {
			console.log(e)
			return false
		}
	}

	@Field(type => Boolean, {
		description: 'false means entered password is incorrect.',
		nullable: true
	})
	public async updatePassword(
		@Arg('userId', type => String)
		userId: string,
		@Arg('currentPassword', type => String)
		currentPassword: string,
		@Arg('newPassword', type => String)
		newPassword: string
	) {
		try {
			const u = await UserModel.findById(userId)
			if (u) {
				const user: any = u.toObject()
				const passwordCorrect = await verifyPassword(currentPassword, user.password)
				if (passwordCorrect) {
					const hash = await hashPassword(newPassword)
					await UserModel.updateOne({ _id: userId }, { password: hash })
					return true
				} else {
					return false
				}
			} else {
				return false
			}
		} catch (e) {
			console.log(e)
			return false
		}
	}

	@Field(type => Boolean, {
		description: 'Updates the notification Id for a user that was not set up on native devices.',
		nullable: true
	})
	public async updateNotificationId(
		@Arg('userId', type => String)
		userId: string,
		@Arg('notificationId', type => String)
		notificationId: string,
	) {
		try {
			const u = await UserModel.findById(userId)
			if (u) {
				await UserModel.updateOne({ _id: userId }, { notificationId })
				return true
			} else {
				return false
			}
		} catch (e) {
			console.log(e)
			return false
		}
	}

	@Field(type => Boolean, {
		description: 'Resets password using email.',
		nullable: true
	})
	public async resetPassword(
		@Arg('email', type => String)
		email: string
	) {
		try {
			const u = await UserModel.findOne({ email })
			if (u) {
				const newPassword = (Math.random() + Math.random()).toString(36).substring(7);
				const hash = await hashPassword(newPassword)
				await UserModel.updateOne({ email }, { password: hash })
				const emailService = new EmailService()
				emailService.resetPassword(email, newPassword)
				return true
			} else {
				return false
			}
		} catch (e) {
			console.log(e)
			return false
		}
	}

	@Field(type => String)
	public async signup(
		@Arg('fullName', type => String)
		fullName: string,
		@Arg('displayName', type => String)
		displayName: string,
		@Arg('userId', type => String)
		userId: string,
		@Arg('email', type => String)
		email: string,
		@Arg('password', type => String)
		password: string
	) {
		try {
			// First lookup document with provided email
			const existingUser = await UserModel.findOne({
				email
			});

			if (existingUser !== null) {
				return "Email already in use."
			}

			const hash = await hashPassword(password)
			await UserModel.updateOne(
				{ _id: userId },
				{
					fullName,
					displayName,
					password: hash,
					email
				})
			return ""
		} catch (e) {
			console.log(e)
			return "Something went wrong. Try again."
		}
	}

	@Field(type => Boolean)
	public async saveConfigToCloud(
		@Arg('sleepFrom', type => String)
		sleepFrom: string,
		@Arg('sleepTo', type => String)
		sleepTo: string,
		@Arg('randomShuffleFrequency', type => String)
		randomShuffleFrequency: string,
		@Arg('userId', type => String)
		userId: string,
		@Arg('currentDraft', { nullable: true })
		currentDraft?: string,
	) {
		try {
			await UserModel.updateOne(
				{ _id: userId },
				{
					sleepTo,
					sleepFrom,
					randomShuffleFrequency,
					currentDraft,
					// subscriptions
				})
			return true
		} catch (e) {
			console.log(e)
			return false
		}
	}

	@Field(type => Boolean)
	public async addUsersToOrganisation(
		@Arg('emails', type => [String])
		emails: string[],
		@Arg('schoolId', type => String)
		schoolId: string
	) {
		try {

			const from = new Date()
			from.setHours(23, 0, 0)

			const to = new Date()
			to.setHours(7, 0, 0)

			const notificationId = 'NOT_SET';

			emails.map(async (email) => {
				const user = await UserModel.findOne({ email })
				// if user exists
				if (user) {
					// Then assign that school to the user
					await UserModel.updateOne({ _id: user._id }, { schoolId })
					// send email
					const emailService = new EmailService()
					const org: any = await SchoolsModel.findById(schoolId)
					emailService.addedToOrgConfirm(user.email ? user.email : '', org.name)

				} else {
					// create user with the school
					const username = email.split('@')[0] + Math.floor(Math.random() * (999 - 100 + 1) + 100).toString()
					const fullName = username
					const displayName = username
					const password = username + '@123'

					const hash = await hashPassword(password)
					const newUser = await UserModel.create({
						schoolId,
						email,
						fullName,
						displayName,
						password: hash,
						notificationId,
						randomShuffleFrequency: '1-D',
						sleepFrom: from,
						sleepTo: to,
						currentDraft: '',
					})
					// give default CUES
					const defaultCues: any = await CueModel.find({
						_id: {
							$in: [
								'60ab0dbf3e057c171516ee98',
								'60ab0dbf3e057c171516ee99',
								'60ab0dbf3e057c171516ee9a',
								'60ab28013e057c171516eeb7'
							]
						}
					})
					const newCues: any[] = []
					defaultCues.map((c: any) => {
						const newCue = c.toObject()
						delete newCue.__v
						delete newCue._id
						const updatedCue = {
							...newCue,
							createdBy: newUser._id,
							date: new Date()
						}
						newCues.push(updatedCue)
					})
					await CueModel.insertMany(newCues)
					// send email
					const emailService = new EmailService()
					const org: any = await SchoolsModel.findById(schoolId)
					emailService.newAccountAddedToOrgConfirm(email, password, org.name)
				}

			})
			return true

		} catch (e) {
			console.log(e)
			return false
		}
	}

	@Field(type => Boolean)
	public async deleteUsersFromOrganisation(
		@Arg('emails', type => [String])
		emails: string[],
		@Arg('schoolId', type => String)
		schoolId: string
	) {
		try {
			emails.map(async (email) => {
				const user = await UserModel.findOne({ email, schoolId })
				if (user) {
					// remove school from user
					await UserModel.updateOne({ _id: user._id }, { schoolId: undefined })
					// remove school subscriptions
				}
			})
			return true
		} catch (e) {
			console.log(e)
			return false
		}
	}

	@Field(type => Boolean)
	public async inviteByEmail(
		@Arg('emails', type => [String])
		emails: string[],
		@Arg('channelId', type => String)
		channelId: string
	) {
		try {

			const from = new Date()
			from.setHours(23, 0, 0)
			const to = new Date()
			to.setHours(7, 0, 0)
			const notificationId = 'NOT_SET';

			const channel: any = await ChannelModel.findById(channelId)
			const owner: any = await UserModel.findById(channel.createdBy)
			const schoolId = owner.schoolId ? owner.schoolId : undefined;

			emails.forEach(async (email) => {
				const user = await UserModel.findOne({ email })
				// if user exists
				if (user) {
					// Check if user already exists in the channel (What if channel member is inactive? )
					const subscriptionFound = await SubscriptionModel.findOne({
						userId: user._id,
						channelId: channel._id
					})

					if (subscriptionFound) {
						return;
					}
					// if owner is part of org, user should be part of org
					if (schoolId) {
						if (user.schoolId && user.schoolId.toString().trim() === schoolId.toString().trim()) {
							// Subscribe the user
							const pastSubs = await SubscriptionModel.find({
								userId: user._id,
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
									duplicate.userId = user._id
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
									userId: user._id,
									channelId: channel._id,
									cueId: thread.cueId ? thread.cueId : null,
									threadId: thread.parentId ? thread.parentId : thread._id
								})
							})

							await SubscriptionModel.updateMany({
								userId: user._id,
								channelId: channel._id,
								unsubscribedAt: { $exists: true }
							}, {
								keepContent: false
							})
							await SubscriptionModel.create({
								userId: user._id, channelId: channel._id
							})
							// send email
							const emailService = new EmailService()
							emailService.inviteByEmail(user.email ? user.email : '', channel.name)
						}
						// else do nothing
					} else {
						// Subscribe the user
						const pastSubs = await SubscriptionModel.find({
							userId: user._id,
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
								duplicate.userId = user._id
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
								userId: user._id,
								channelId: channel._id,
								cueId: thread.cueId ? thread.cueId : null,
								threadId: thread.parentId ? thread.parentId : thread._id
							})
						})

						await SubscriptionModel.updateMany({
							userId: user._id,
							channelId: channel._id,
							unsubscribedAt: { $exists: true }
						}, {
							keepContent: false
						})
						await SubscriptionModel.create({
							userId: user._id, channelId: channel._id
						})
						// send email
						const emailService = new EmailService()
						emailService.inviteByEmail(user.email ? user.email : '', channel.name)
					}
				} else {
					if (!schoolId) {
						// create user
						const username = email.split('@')[0] + Math.floor(Math.random() * (999 - 100 + 1) + 100).toString()
						const fullName = username
						const displayName = username
						const password = username + '@123'
						const hash = await hashPassword(password)
						const newUser = await UserModel.create({
							email,
							fullName,
							displayName,
							password: hash,
							notificationId,
							randomShuffleFrequency: '1-D',
							sleepFrom: from,
							sleepTo: to,
							currentDraft: '',
						})

						// give default CUES
						const defaultCues: any = await CueModel.find({
							_id: {
								$in: [
									'60ab0dbf3e057c171516ee98',
									'60ab0dbf3e057c171516ee99',
									'60ab0dbf3e057c171516ee9a',
									'60ab28013e057c171516eeb7'
								]
							}
						})

						const newCues: any[] = []
						defaultCues.map((c: any) => {
							const newCue = c.toObject()
							delete newCue.__v
							delete newCue._id
							const updatedCue = {
								...newCue,
								createdBy: newUser._id,
								date: new Date()
							}
							newCues.push(updatedCue)
						})
						await CueModel.insertMany(newCues)

						// Subscribe the user
						const pastSubs = await SubscriptionModel.find({
							userId: newUser._id,
							channelId: channel._id
						})

						if (pastSubs.length === 0) {
							const channelCues = await CueModel.find({ channelId: channel._id })
							channelCues.map(async (cue: any) => {
								const cueObject = cue.toObject()
								const duplicate = { ...cueObject }
								delete duplicate._id
								delete duplicate.deletedAt
								delete duplicate.__v
								duplicate.cueId = cue._id
								duplicate.cue = ''
								duplicate.userId = newUser._id
								duplicate.score = 0;
								duplicate.graded = false
								const u = await ModificationsModel.create(duplicate)
							})

						}
						await SubscriptionModel.updateMany({
							userId: newUser._id,
							channelId: channel._id,
							unsubscribedAt: { $exists: true }
						}, {
							keepContent: false
						})
						await SubscriptionModel.create({
							userId: newUser._id, channelId: channel._id
						})
						// send email
						const emailService = new EmailService()
						emailService.newAccountInviteByEmail(email, password, channel.name)
					}
				}

			})
			return true

		} catch (e) {
			console.log(e)
			return false
		}
	}

}
