import { hashPassword } from '@app/data/methods';
import { UserModel } from '@app/data/user/mongo/User.model';
import { EmailService } from '../../../emailservice/Postmark';
import { Arg, Field, ObjectType } from 'type-graphql';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'
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

	@Field(type => Boolean)
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
			const hash = await hashPassword(password)
			await UserModel.updateOne(
				{ _id: userId },
				{
					fullName,
					displayName,
					password: hash,
					email
				})
			return true
		} catch (e) {
			console.log(e)
			return false
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
					const fullName = uniqueNamesGenerator({
						dictionaries: [adjectives, colors, animals]
					});
					const displayName = uniqueNamesGenerator({
						dictionaries: [adjectives, colors, animals]
					});
					const password = uniqueNamesGenerator({
						dictionaries: [adjectives, colors, animals]
					});
					const hash = await hashPassword(password)
					await UserModel.create({
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

			emails.map(async (email) => {
				const user = await UserModel.findOne({ email })
				// if user exists
				if (user) {
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
									const duplicate = { ...cue }
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
								const duplicate = { ...cue }
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
						const fullName = uniqueNamesGenerator({
							dictionaries: [adjectives, colors, animals]
						});
						const displayName = uniqueNamesGenerator({
							dictionaries: [adjectives, colors, animals]
						});
						const password = uniqueNamesGenerator({
							dictionaries: [adjectives, colors, animals]
						});
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
						// Subscribe the user
						const pastSubs = await SubscriptionModel.find({
							userId: newUser._id,
							channelId: channel._id
						})
						if (pastSubs.length === 0) {
							const channelCues = await CueModel.find({ channelId: channel._id })
							channelCues.map(async (cue: any) => {
								const duplicate = { ...cue }
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
