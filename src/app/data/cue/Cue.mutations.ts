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
import { QuizModel } from '../quiz/mongo/Quiz.model';

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
		@Arg('shareWithUserIds', type => [String], { nullable: true }) shareWithUserIds?: string[]
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
				...c,
				limitedShares: (shareWithUserIds !== undefined && shareWithUserIds !== null) ? true : false
			})

			const notificationService = new Expo()
			let userIds: string[] = []
			const messages: any[] = []
			const tickets = [];
			const notSetUserIds: any[] = []
			const modifications: any[] = []

			if (shareWithUserIds !== undefined && shareWithUserIds !== null) {
				userIds = shareWithUserIds;
				userIds.map((userId: string) => {
					modifications.push({
						...c,
						cueId: newCue._id,
						userId,
						graded: false,
						score: 0,
						cue: ''
					})
				})
			} else {
				const subscriptions = await SubscriptionModel.find({
					$and: [{ channelId }, { unsubscribedAt: { $exists: false } }]
				})
				subscriptions.map((s) => {
					userIds.push(s.userId)
					modifications.push({
						...c,
						cueId: newCue._id,
						userId: s.userId,
						graded: false,
						score: 0,
						cue: ''
					})
				})
			}
			console.log(modifications)
			// insert documents in modifications model
			await ModificationsModel.insertMany(modifications)
			// load subscribers
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

			// for user Ids that have no notification receiver attached to them
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
					//  now update modifications objects
					if (cue.createdBy.toString().trim() !== userId.toString().trim()) {
						// Deleting these because they should not be changed...
						delete c.deadline
						delete c.gradeWeight
						delete c.submission

						delete c.score
						delete c.submittedAt
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
						} else {
							// the cue was deleted by owner. do nothing.
						}
					} else {
						// update all modification objects with that particular CueId along with details to original one
						const subscribers: any[] = await SubscriptionModel.find({
							channelId: cue.channelId,
							unsubscribedAt: { $exists: false }
						})
						const userIds: any[] = []
						subscribers.map((s) => {
							const sub = s.toObject()
							userIds.push(sub.userId)
						})

						delete c.score
						delete c.graded
						delete c.submittedAt
						delete c.createdBy
						delete c.cue

						await ModificationsModel.updateMany({
							cueId: cue._id,
							userId: { $in: userIds }
						}, {
							...c,
							gradeWeight: (c.submission) ? Number(c.gradeWeight) : undefined
						})
						// also update original cue !!
						await CueModel.updateOne({
							_id: cue._id
						}, {
							...c,
							gradeWeight: (c.submission) ? Number(c.gradeWeight) : undefined
						})

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
	public async deleteForEveryone(
		@Arg('cueId', type => String)
		cueId: string,
	) {
		try {
			await ModificationsModel.deleteMany({ cueId })
			await CueModel.deleteOne({ _id: cueId })
			return true
		} catch (e) {
			console.log(e)
			return false;
		}
	}

	@Field(type => Boolean)
	public async submitModification(
		@Arg('userId', type => String)
		userId: string,
		@Arg('cueId', type => String)
		cueId: string,
		@Arg('cue', type => String)
		cue: string,
		@Arg('quizId', type => String, { nullable: true })
		quizId?: string
	) {
		try {
			if (quizId !== undefined && quizId !== null) {
				const solutionsObject = JSON.parse(cue)
				const solutions = solutionsObject.solutions;
				// grade submission over here
				const quizDoc: any = await QuizModel.findById(quizId)
				let score = 0;
				let total = 0;
				const quiz = quizDoc.toObject()
				quiz.problems.map((problem: any, i: any) => {
					total += 1;
					let correctAnswers = 0;
					let totalAnswers = 0;
					problem.options.map((option: any, j: any) => {
						if (option.isCorrect && solutions[i].selected[j].isSelected) {
							correctAnswers += 1
						}
						if (option.isCorrect) {
							totalAnswers += 1
						}
					})
					score += Number((correctAnswers / totalAnswers).toFixed(2))
				})
				await ModificationsModel.updateOne({ cueId, userId }, { submittedAt: new Date(), cue, graded: true, score: Number(((score / total) * 100).toFixed(2)) })
			} else {
				await ModificationsModel.updateOne({ cueId, userId }, { submittedAt: new Date(), cue })
			}
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
		score: string,
		@Arg('comment', type => String, { nullable: true })
		comment?: string
	) {
		try {
			await ModificationsModel.updateOne({ cueId, userId }, {
				score: Number(score),
				comment: comment && comment !== '' ? comment : '',
				graded: true
			})
			return true
		} catch (e) {
			console.log(e)
			return false;
		}
	}

	@Field(type => Boolean)
	public async shareCueWithMoreIds(
		@Arg('userId', type => String)
		userId: string,
		@Arg('cueId', type => String)
		cueId: string,
	) {
		try {
			const c: any = await CueModel.findOne({ _id: cueId })
			if (c) {
				const cue = c.toObject()
				cue.cueId = cue._id;
				delete cue._id;
				delete cue.limitedShares;
				cue.userId = userId;
				cue.cue = '';
				cue.score = 0;
				cue.graded = false;
				delete cue.__v;
				delete cue.__typename;
				await ModificationsModel.create({ ...cue })
				// create status here
				await StatusModel.create({
					userId,
					channelId: cue.channelId,
					status: 'not-delivered',
					cueId: cue.cueId
				})
				return true
			}
			return false
		} catch (e) {
			console.log(e)
			return false;
		}
	}

}
