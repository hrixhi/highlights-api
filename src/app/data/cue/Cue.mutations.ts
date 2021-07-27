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
import { ChannelModel } from '../channel/mongo/Channel.model';
import * as OneSignal from 'onesignal-node';

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
		@Arg('initiateAt', { nullable: true }) initiateAt?: string,
		@Arg('endPlayAt', { nullable: true }) endPlayAt?: string,
		@Arg('customCategory', { nullable: true }) customCategory?: string,
		@Arg('shareWithUserIds', type => [String], { nullable: true }) shareWithUserIds?: string[]
	) {
		try {

			let createdByToUse = createdBy;

			const channel: any = await ChannelModel.findById(channelId)

			if (!channel) return false;

			const { owners  = [] } = channel;

			if (owners.length > 0) {
				const anotherOwner = owners.find((item: any) => {
					return item === createdBy;
				})
			    if (anotherOwner) {
					createdByToUse = channel.createdBy
		        } 
			}

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
				createdBy: createdByToUse,
				gradeWeight: Number(gradeWeight),
				deadline: (deadline && deadline !== '') ? new Date(deadline) : null,
				initiateAt: (initiateAt && initiateAt !== '') ? new Date(initiateAt) : null,
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
			// insert documents in modifications model
			await ModificationsModel.insertMany(modifications)
			// load subscribers
			const subscribers = await UserModel.find({ _id: { $in: userIds } })
			subscribers.map((sub) => {
				const notificationIds = sub.notificationId.split('-BREAK-')
				notificationIds.map((notifId: any) => {
					if (!Expo.isExpoPushToken(notifId)) {
						notSetUserIds.push(sub._id)
						return
					}
					const { title, subtitle: body } = htmlStringParser(cue)
					messages.push({
						to: notifId,
						sound: 'default',
						subtitle: title,
						title: channel.name + ' - New Cue',
						body,
						data: { userId: sub._id },
					})
				})
			})

			// Web notifications

			const oneSignalClient = new OneSignal.Client('51db5230-f2f3-491a-a5b9-e4fba0f23c76', 'Yjg4NTYxODEtNDBiOS00NDU5LTk3NDItZjE3ZmIzZTVhMDBh')

			const { title } = htmlStringParser(cue)

			const notification = {
				contents: {
					'en': `${channel.name}` + ' - New Cue: ' + title,
				},
				include_external_user_ids: userIds
			}

			const response = await oneSignalClient.createNotification(notification)

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

	@Field(type => Boolean, {
		description: 'Used when you want to delete a cue.'
	})
	public async delete(
		@Arg('cueId', type => String) cueId: string,
	) {
		try {
			await CueModel.deleteOne({ _id: cueId })
			return true
		} catch (e) {
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
						delete c.original;
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
						delete c.initiateAt
						delete c.gradeWeight
						delete c.submission

						delete c.score
						delete c.submittedAt
						delete c.createdBy
						delete c.graded;
						delete c.original;
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
						const tempCue = c.cue
						const tempOriginal = c.original;
						delete c.cue;
						delete c.original;

						if (tempOriginal === undefined || tempOriginal === null) {
							await CueModel.updateOne({
								_id: cue._id
							}, {
								...c,
								gradeWeight: (c.submission) ? Number(c.gradeWeight) : undefined
							})
						} else {
							await CueModel.updateOne({
								_id: cue._id
							}, {
								...c,
								cue: tempOriginal,
								gradeWeight: (c.submission) ? Number(c.gradeWeight) : undefined
							})
						}
						const updates = await ModificationsModel.updateMany({
							cueId: cue._id,
							userId: { $in: userIds }
						}, {
							...c,
							gradeWeight: (c.submission) ? Number(c.gradeWeight) : undefined
						})
						// get the cue back to the main owner
						await ModificationsModel.updateOne({ _id: userId }, { cue: tempCue })
						// also update original cue !!

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
			const mod = await ModificationsModel.findOne({ cueId, userId })
			// if (mod) {
			// 	const modification = mod.toObject()
			// 	if (modification.submittedAt !== undefined && modification.submittedAt !== null) {
			// 		// already submitted 
			// 		return true;
			// 	}
			// }

			let isQuizFullyGraded = false;

			if (quizId !== undefined && quizId !== null) {
				const solutionsObject = JSON.parse(cue)
				const solutions = solutionsObject.solutions;
				// grade submission over here
				const quizDoc: any = await QuizModel.findById(quizId)
				let score = 0;
				let total = 0;
				const quiz = quizDoc.toObject()

				let isSubjective = false;

				// Add an array for Individual Scores for era
				solutionsObject.problemScores = [];


				quiz.problems.forEach((problem: any, i: any) => {

					// Increment total points
					total += (problem.points !== null && problem.points !== undefined ? problem.points : 1);
					
					// Add more types here which require checking
					if (problem.questionType && problem.questionType === "freeResponse") {
						isSubjective = true;	
						solutionsObject.problemScores.push("");
						return;																														
					}

					// Add check for partial grading later for MCQs
					let correctAnswers = 0;
					let totalAnswers = 0;

					problem.options.map((option: any, j: any) => {
						if (option.isCorrect && solutions[i].selected[j].isSelected) {
							// correct answers
							correctAnswers += 1
						}
						// TO FIX
						if (option.isCorrect) {
							// total correct answers
							totalAnswers += 1
						}
						if (!option.isCorrect && solutions[i].selected[j].isSelected) {
							// to deduct points if answer is not correct but selected
							totalAnswers += 1;
						}
					})

					const calculatedScore = ((correctAnswers / totalAnswers) * (problem.points !== undefined && problem.points !== null ? problem.points : 1)).toFixed(2)

					solutionsObject.problemScores.push(calculatedScore);
					score += Number(calculatedScore)
				})
				// If not subjective then graded should be set to true
				isQuizFullyGraded = !isSubjective
				await ModificationsModel.updateOne({ cueId, userId }, { submittedAt: new Date(), cue: JSON.stringify(solutionsObject), graded: !isSubjective, score: Number(((score / total) * 100).toFixed(2)) })
			} else {
				await ModificationsModel.updateOne({ cueId, userId }, { submittedAt: new Date(), cue })
			}

			const c: any = await CueModel.findById(cueId)
			const channel: any = await ChannelModel.findById(c.channelId)
			const user: any = await UserModel.findById(userId)
			const messages: any[] = []
			const notificationService = new Expo()

			const notificationIds = user.notificationId.split('-BREAK-')
			notificationIds.map((notifId: any) => {
				if (!Expo.isExpoPushToken(notifId)) {
					return
				}
				const { title } = htmlStringParser(c.cue)
				messages.push({
					to: notifId,
					sound: 'default',
					subtitle: (quizId !== undefined && quizId !== null && isQuizFullyGraded ? 'Graded! ' : 'Submitted! ') + title,
					title: channel.name + ' - Submission Complete',
					data: { userId: user._id },
				})
			})

			// Web notifications

			const oneSignalClient = new OneSignal.Client('51db5230-f2f3-491a-a5b9-e4fba0f23c76', 'Yjg4NTYxODEtNDBiOS00NDU5LTk3NDItZjE3ZmIzZTVhMDBh')


			const { title } = htmlStringParser(c.cue)

			const notification = {
				contents: {
					'en': `${channel.name}` + (quizId !== undefined && quizId !== null && isQuizFullyGraded ? 'Graded! ' : 'Submitted! ') + title,
				},
				include_external_user_ids: [user._id]
			}

			const response = await oneSignalClient.createNotification(notification)

			let chunks = notificationService.chunkPushNotifications(messages);
			for (let chunk of chunks) {
				try {
					await notificationService.sendPushNotificationsAsync(chunk);
				} catch (e) {
					console.error(e);
				}
			}
			return true
		} catch (e) {
			console.log(e)
			return false;
		}
	}

	@Field(type => Boolean)
	public async gradeQuiz(
		@Arg('userId', type => String)
		userId: string,
		@Arg('cueId', type => String)
		cueId: string,
		@Arg('problemScores', type => [String]!)
		problemScores: string[],
		@Arg('problemComments', type => [String]!)
		problemComments: string[],
		@Arg('score', type => Number, { nullable: true })
		score?: number,
		@Arg('comment', type => String, { nullable: true })
		comment?: string
	) {
		try {
			const mod = await ModificationsModel.findOne({ cueId, userId })

			if (!mod) return false;

			if (mod.cue) {
				const submissionObj = JSON.parse(mod.cue);

				submissionObj.problemScores = problemScores;
				submissionObj.problemComments = problemComments;

				const update  = await ModificationsModel.updateOne({
					cueId,
					userId
				}, {
					score: Number(score),
					comment: comment && comment !== '' ? comment : '',
					graded: true,
					cue: JSON.stringify(submissionObj)
				})

				return true;

			}

			return false;
			

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
			const cue: any = await CueModel.findById(cueId)
			const channel: any = await ChannelModel.findById(cue.channelId)
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
	public async editReleaseSubmission(
		@Arg('cueId', type => String)
		cueId: string,
		@Arg('releaseSubmission', type => Boolean)
		releaseSubmission: boolean
	) {
		try {

			const updateCue = await CueModel.updateOne({
				_id: cueId
			}, {
				releaseSubmission
			})

			const updateModifications = await ModificationsModel.updateMany({
				cueId
			}, {
				releaseSubmission
			})

			const fetchCue = await CueModel.findById(cueId);

			// Add notification here for releasing Submission => If graded say that Grades available or else submission available 
			if (releaseSubmission && fetchCue) {
				const { submission, channelId, gradeWeight, cue } = fetchCue;
				
				const notificationService = new Expo()
				let userIds: string[] = []
				const messages: any[] = []

				const fetchChannel = await ChannelModel.findById(channelId);

				if (!fetchChannel || !submission) return;

				const subscriptions = await SubscriptionModel.find({
					$and: [{ channelId }, { unsubscribedAt: { $exists: false } }]
				})

				subscriptions.map((s) => {
					userIds.push(s.userId)
				})

				const { title, subtitle: body } = htmlStringParser(cue)

				const subscribers = await UserModel.find({ _id: { $in: userIds } })

				subscribers.map((sub) => {
					const notificationIds = sub.notificationId.split('-BREAK-')
					notificationIds.map((notifId: any) => {
						if (!Expo.isExpoPushToken(notifId)) {
							return
						}
						messages.push({
							to: notifId,
							sound: 'default',
							subtitle: title,
							title: fetchChannel.name + ' - ' + title + ' ',
							body: (submission && gradeWeight && gradeWeight > 0 ? " Grades available" : "Submission available"),
							data: { userId: sub._id },
						})
					})
				})

				let chunks = notificationService.chunkPushNotifications(messages);
				for (let chunk of chunks) {
					try {
						let ticketChunk = await notificationService.sendPushNotificationsAsync(chunk);
					} catch (e) {
						console.error(e);
					}
				}

				// Web notifications

				const oneSignalClient = new OneSignal.Client('51db5230-f2f3-491a-a5b9-e4fba0f23c76', 'Yjg4NTYxODEtNDBiOS00NDU5LTk3NDItZjE3ZmIzZTVhMDBh')

				const notification = {
					contents: {
						'en': fetchChannel.name + ' - ' + title + ' ' + (submission && gradeWeight && gradeWeight > 0 ? " Grades available" : "Submission available"),
					},
					include_external_user_ids: userIds
				}

				const response = await oneSignalClient.createNotification(notification)

			}

			return true
		} catch (e) {
			console.log(e);
			return false
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
				const user: any = await UserModel.findById(userId)
				const messages: any[] = []
				const notificationService = new Expo()

				const channel: any = await ChannelModel.findById(cue.channelId)
				const notificationIds = user.notificationId.split('-BREAK-')
				notificationIds.map((notifId: any) => {
					if (!Expo.isExpoPushToken(user.notificationId)) {
						return
					}
					const { title, subtitle: body } = htmlStringParser(cue.cue)
					messages.push({
						to: user.notificationId,
						sound: 'default',
						subtitle: title,
						title: channel.name + ' - New Cue',
						data: { userId: user._id },
					})
				})


				// Web notifications

				const oneSignalClient = new OneSignal.Client('51db5230-f2f3-491a-a5b9-e4fba0f23c76', 'Yjg4NTYxODEtNDBiOS00NDU5LTk3NDItZjE3ZmIzZTVhMDBh')

				const { title } = htmlStringParser(cue.cue)

				const notification = {
					contents: {
						'en': `${channel.name}` + ' - New Cue: ' + title,
					},
					include_external_user_ids: [user._id]
				}

				const response = await oneSignalClient.createNotification(notification)

				let chunks = notificationService.chunkPushNotifications(messages);
				for (let chunk of chunks) {
					try {
						await notificationService.sendPushNotificationsAsync(chunk);
					} catch (e) {
						console.error(e);
					}
				}
				return true
			}
			return false
		} catch (e) {
			console.log(e)
			return false;
		}
	}

}
