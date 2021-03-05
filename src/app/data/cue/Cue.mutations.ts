import { Arg, Field, ObjectType } from 'type-graphql';
import { UserModel } from '../user/mongo/User.model'
import { CueModel } from './mongo/Cue.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { StatusModel } from '../status/mongo/Status.model';
import { Expo } from 'expo-server-sdk';
import { htmlStringParser } from '@helper/HTMLParser';
import fs from 'fs'
import { CueInputObject } from './types/CueInput.type';
import { IDMapObject } from './types/IDMap.type';
import { ModificationsModel } from '../modification/mongo/Modification.model';

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
		@Arg('submission', type => Boolean) submission: boolean,
		@Arg('gradeWeight', type => String) gradeWeight: string,
		@Arg('deadline', { nullable: true }) deadline?: string,
		@Arg('endPlayAt', { nullable: true }) endPlayAt?: string,
		@Arg('customCategory', { nullable: true }) customCategory?: string,
	) {
		try {

			const c = {
				cue,
				color: Number(color),
				customCategory: (customCategory && customCategory !== '') ? customCategory : '',
				frequency,
				shuffle,
				starred,
				date: new Date(),
				endPlayAt: (endPlayAt && endPlayAt !== '') ? new Date(endPlayAt) : null,
				channelId,
				createdBy,
				gradeWeight: Number(gradeWeight),
				deadline: (deadline && deadline !== '') ? new Date(deadline) : null,
				submission
			}

			const newCue = await CueModel.create({
				...c
			})

			const notificationService = new Expo()
			const messages: any[] = []
			const userIds: string[] = []
			const tickets = [];

			const subscriptions = await SubscriptionModel.find({
				$and: [{ channelId }, { unsubscribedAt: { $exists: false } }]
			})

			const modifications: any[] = []
			subscriptions.map((s) => {
				userIds.push(s.userId)
				modifications.push({
					...c,
					cueId: newCue._id,
					userId: s.userId,
					graded: false,
					score: 0,
					cue: submission ? '' : null
				})
			})
			await ModificationsModel.insertMany(modifications)
			const notSetUserIds: any[] = []

			const subscribers = await UserModel.find({ _id: { $in: userIds } })
			subscribers.map((sub) => {
				if (!Expo.isExpoPushToken(sub.notificationId)) {
					notSetUserIds.push(sub._id)
					return
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

			notSetUserIds.map(async uId => {
				await StatusModel.create({
					userId: uId,
					channelId,
					cueId: newCue._id,
					status: 'not-delivered'
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

	@Field(type => String, {
		description: 'Used when you want to convert docx to html.'
	})
	public async convertDocxToHtml(
		@Arg('docx', type => String) docx: string
	) {
		try {

			const mammoth = require('mammoth')
			let err = false;
			const uri = __dirname + "/docs/" + Math.random().toString() + '.docx'
			fs.writeFile(
				uri,
				docx,
				{ encoding: 'base64' },
				(status) => {
					if (status) {
						err = true
					}
				}
			);

			if (err) {
				return "error"
			}

			const result = await mammoth.convertToHtml(
				{ path: uri },
				{
					convertImage: mammoth.images.dataUri
				}
			)

			return result.value

		} catch (e) {
			console.log(e)
			return "error"
		}
	}

	@Field(type => [IDMapObject])
	public async saveCuesToCloud(
		@Arg('cues', type => [CueInputObject])
		cues: [CueInputObject],
		@Arg('userId', type => String)
		userId: string,
	) {
		try {
			// make sure dates are saved correctly
			const idMap: any[] = []
			const toBeCreated: any[] = []
			cues.map((cue: any) => {
				if (!cue.channelId || cue.channelId === '') {
					// Local cue
					if (!Number.isNaN(Number(cue._id))) {
						// create a new cue
						const c = {
							...cue,
							channelId: null,
							createdBy: userId,
							color: Number(cue.color),
							date: new Date(cue.date),
							endPlayAt: (cue.endPlayAt && cue.endPlayAt !== '') ? new Date(cue.endPlayAt) : null,
						}
						delete c._id;
						toBeCreated.push(c)
						idMap.push({
							oldId: cue._id,
							newId: ''
						})
					}
				}
			})
			const newCues = await CueModel.insertMany(toBeCreated)
			newCues.map((item: any, index: number) => {
				idMap[index].newId = item._id
			})
			cues.map(async (cue: any) => {
				const c = {
					...cue,
					color: Number(cue.color),
					date: new Date(cue.date),
					endPlayAt: (cue.endPlayAt && cue.endPlayAt !== '') ? new Date(cue.endPlayAt) : null,
				}
				delete c._id
				if (cue.channelId && cue.channelId !== '') {
					// Deleting these because they should not be changed...
					if (cue.createdBy.toString().trim() !== userId.toString().trim()) {
						delete c.deadline
						delete c.score
						delete c.gradeWeight
						delete c.submittedAt
						delete c.submission
						delete c.createdBy
						delete c.graded;
						// Channel cue
						const mod = await ModificationsModel.findOne({ userId, cueId: cue._id })
						if (mod) {
							// update modified
							await ModificationsModel.updateOne({
								cueId: cue._id,
								userId
							}, {
								...c
							})
						}
					} else {
						// update all modification objects with that particular CueId along with details to original one
					}
				} else {
					// Local cue
					if (Number.isNaN(Number(cue._id))) {
						// update the cue
						await CueModel.updateOne({ _id: cue._id }, { ...c })
					}
				}
			})
			return idMap
		} catch (e) {
			console.log(e)
			return []
		}
	}

	@Field(type => Boolean)
	public async submitModification(
		@Arg('userId', type => String)
		userId: string,
		@Arg('cueId', type => String)
		cueId: string
	) {
		try {
			await ModificationsModel.updateOne({ cueId, userId }, { submittedAt: new Date() })
			return true
		} catch (e) {
			console.log(e)
			return false;
		}
	}

	@Field(type => Boolean)
	public async submitGrade(
		@Arg('userId', type => String)
		userId: string,
		@Arg('cueId', type => String)
		cueId: string,
		@Arg('score', type => String)
		score: string
	) {
		try {
			await ModificationsModel.updateOne({ cueId, userId }, { score: Number(score), graded: true })
			return true
		} catch (e) {
			console.log(e)
			return false;
		}
	}

}
