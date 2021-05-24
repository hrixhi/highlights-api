import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { ThreadStatusModel } from '../thread-status/mongo/thread-status.model';
import { ThreadModel } from '../thread/mongo/Thread.model';
import { UserModel } from '../user/mongo/User.model';
import { SubscriptionModel } from './mongo/Subscription.model';
/**
 * Subscription Mutation Endpoints
 */
@ObjectType()
export class SubscriptionMutationResolver {

	@Field(type => String, {
		description: 'Subscribes to a channel & returns "error" or "subscribed" or "incorrect-password" or "your-channel" or "already-subbed".'
	})
	public async subscribe(
		@Arg('userId', type => String) userId: string,
		@Arg('name', type => String) name: string,
		@Arg('password', { nullable: true }) password?: string
	) {
		try {
			const channel = await ChannelModel.findOne({ name })
			if (channel) {
				const sub = await SubscriptionModel.findOne({
					userId,
					channelId: channel._id,
					unsubscribedAt: { $exists: false }
				})
				if (sub) {
					return 'already-subbed'
				}
				if (channel.password && channel.password !== '') {

					if (password === undefined || password === null || password === '') {
						return 'incorrect-password'
					}
					// Private
					if (channel.password.toString().trim() === password.toString().trim()) {

						// check org
						const owner = await UserModel.findById(channel.createdBy)
						if (owner && owner.schoolId && owner.schoolId !== '') {
							const u = await UserModel.findById(userId)
							if (u && (!u.schoolId || u.schoolId.toString().trim() !== owner.schoolId.toString().trim())) {
								// not same school
								return 'error'
							}
						}

						// Correct password - subscribed!
						// Clear any old subscriptions with kc = true
						const pastSubs = await SubscriptionModel.find({
							userId,
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

						await SubscriptionModel.updateMany({
							userId,
							channelId: channel._id,
							unsubscribedAt: { $exists: true }
						}, {
							keepContent: false
						})
						// subscribe 
						await SubscriptionModel.create({
							userId, channelId: channel._id
						})

						// Check if channel owner, if yes then update creatorUnsubscribed: true
						if (channel.createdBy.toString().trim() === userId.toString().trim()) {
							console.log("creatorUnsubscribed", "false")
							await ChannelModel.updateOne({
								_id: channel._id
							}, {
								creatorUnsubscribed: false
							})
						}

						return 'subscribed'
					} else {
						// Incorrect password
						return 'incorrect-password'
					}

				} else {
					// Public
					const owner = await UserModel.findById(channel.createdBy)
					if (owner && owner.schoolId && owner.schoolId !== '') {
						const u = await UserModel.findById(userId)
						if (u && (!u.schoolId || u.schoolId.toString().trim() !== owner.schoolId.toString().trim())) {
							// not same school
							return 'error'
						}
					}

					const pastSubs = await SubscriptionModel.find({
						userId,
						channelId: channel._id
					})
					if (pastSubs.length === 0) {
						const channelCues = await CueModel.find({ channelId: channel._id, limitedShares: { $ne: true } })
						channelCues.map(async (cue: any) => {
							const obj = cue.toObject()
							const duplicate = { ...obj }
							delete duplicate._id
							delete duplicate.deletedAt
							delete duplicate.__v
							duplicate.cue = ''
							duplicate.cueId = cue._id
							duplicate.userId = userId
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

					await SubscriptionModel.create({
						userId, channelId: channel._id
					})
					// Check if channel owner, if yes then update creatorUnsubscribed: true
					if (channel.createdBy.toString().trim() === userId.toString().trim()) {
						console.log("creatorUnsubscribed", "false")
						await ChannelModel.updateOne({
							_id: channel._id
						}, {
							creatorUnsubscribed: false
						})
					}
					
					return 'subscribed'
				}
			} else {
				// Channel does not exist
				return 'error';
			}
		} catch (e) {
			// Something went wrong
			return 'error';
		}
	}

	@Field(type => Boolean, {
		description: 'Unsubscribes from channel'
	})
	public async unsubscribe(
		@Arg('userId', type => String) userId: string,
		@Arg('channelId', type => String) channelId: string,
		@Arg('keepContent', type => Boolean) keepContent: boolean
	) {
		try {
			let subObject = await SubscriptionModel.findOne({
				userId,
				channelId,
				unsubscribedAt: { $exists: false }
			})
			if (!subObject) {
				if (keepContent) {
					return false
				} else {
					// if erase content unsub is done after a keep content unsub
					subObject = await SubscriptionModel.findOne({
						userId,
						channelId,
						unsubscribedAt: { $exists: true },
						keepContent: true
					})
					if (!subObject) {
						return false
					}
				}

			}
			// otherwise unsub
			await SubscriptionModel.updateOne({
				_id: subObject._id
			}, {
				unsubscribedAt: new Date(),
				keepContent
			})

			// Check if user is Channel owner 
			const channelObj = await ChannelModel.findById(channelId);

			// If user is channel creator, update creatorUnsubscribed: true
			console.log(channelObj && channelObj.createdBy);

			console.log(userId);
			
			if (channelObj && channelObj.createdBy.toString().trim() === userId.toString().trim()) {
				console.log("creatorUnsubscribed", "true")
				await ChannelModel.updateOne({
					_id: channelId
				}, {
					creatorUnsubscribed: true
				})
			}

			return true
		} catch (e) {
			console.log(e)
			return false
		}
	}

	@Field(type => Boolean, {
		description: 'Makes user active again (active by default)'
	})
	public async makeActive(
		@Arg('userId', type => String) userId: string,
		@Arg('channelId', type => String) channelId: string,
	) {
		try {
			const sub = await SubscriptionModel.findOne({
				userId,
				channelId,
				unsubscribedAt: { $exists: false },
			})
			if (sub) {
				const subscription = sub.toObject();
				if (subscription.inactive !== true) {
					return false
				} else {
					await SubscriptionModel.updateOne({ _id: subscription._id }, { inactive: false })
					return true
				}
			} else {
				return false;
			}
		} catch (e) {
			console.log(e)
			return false
		}
	}

	@Field(type => Boolean, {
		description: 'Makes user inactive'
	})
	public async makeInactive(
		@Arg('userId', type => String) userId: string,
		@Arg('channelId', type => String) channelId: string,
	) {
		try {
			const sub = await SubscriptionModel.findOne({
				userId,
				channelId,
				unsubscribedAt: { $exists: false },
			})
			if (sub) {
				const subscription = sub.toObject();
				if (subscription.inactive === true) {
					return false
				} else {
					await SubscriptionModel.updateOne({ _id: subscription._id }, { inactive: true })
					return true
				}
			} else {
				return false;
			}
		} catch (e) {
			console.log(e)
			return false
		}
	}

}
