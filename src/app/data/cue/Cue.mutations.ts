import { Arg, Field, ObjectType } from 'type-graphql';
import { UserModel } from '../user/mongo/User.model';
import { CueModel } from './mongo/Cue.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { StatusModel } from '../status/mongo/Status.model';
import { Expo } from 'expo-server-sdk';
import { htmlStringParser } from '@helper/HTMLParser';
import fs from 'fs';
import { CueInputObject } from './types/CueInput.type';
import { IDMapObject } from './types/IDMap.type';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { QuizModel } from '../quiz/mongo/Quiz.model';
import { ChannelModel } from '../channel/mongo/Channel.model';
import * as OneSignal from 'onesignal-node';
import { ActivityModel } from '../activity/mongo/activity.model';
import pdf from 'html-pdf';
import * as AWS from 'aws-sdk';
import { FolderModel } from '../folder/mongo/folder.model';
import Axios from 'axios';
import { CueObject } from './types/Cue.type';
const Promise = require('bluebird');

/**
 * Cue Mutation Endpoints
 */
@ObjectType()
export class CueMutationResolver {
    @Field((type) => CueObject, {
        description: 'Used when you want to create a channel cue.',
        nullable: true,
    })
    public async create(
        @Arg('cue', (type) => String) cue: string,
        @Arg('color', (type) => String) color: string,
        @Arg('channelId', (type) => String) channelId: string,
        @Arg('frequency', (type) => String) frequency: string,
        @Arg('shuffle', (type) => Boolean) shuffle: boolean,
        @Arg('starred', (type) => Boolean) starred: boolean,
        @Arg('createdBy', (type) => String) createdBy: string,
        @Arg('submission', (type) => Boolean) submission: boolean,
        @Arg('gradeWeight', (type) => String) gradeWeight: string,
        @Arg('deadline', { nullable: true }) deadline?: string,
        @Arg('initiateAt', { nullable: true }) initiateAt?: string,
        @Arg('endPlayAt', { nullable: true }) endPlayAt?: string,
        @Arg('customCategory', { nullable: true }) customCategory?: string,
        @Arg('shareWithUserIds', (type) => [String], { nullable: true }) shareWithUserIds?: string[],
        @Arg('limitedShares', (type) => Boolean, { nullable: true }) limitedShares?: Boolean,
        @Arg('allowedAttempts', (type) => String, { nullable: true }) allowedAttempts?: string,
        @Arg('availableUntil', { nullable: true }) availableUntil?: string,
        @Arg('totalPoints', (type) => String, { nullable: true }) totalPoints?: string
    ) {
        try {
            // This code flips the createdBy if a moderator and not the main channel owner is making the cue
            let createdByToUse = createdBy;

            const channel: any = await ChannelModel.findById(channelId);

            if (!channel) return false;

            const { owners = [] } = channel;

            const ownersSet = new Set();

            ownersSet.add(channel.createdBy);

            owners.map((owner: any) => ownersSet.add(owner));

            const ownerIds: any = Array.from(ownersSet);

            if (owners.length > 0) {
                const anotherOwner = owners.find((item: any) => {
                    return item === createdBy;
                });
                if (anotherOwner) {
                    createdByToUse = channel.createdBy;
                }
            }

            // < ----------- >

            const c = {
                cue,
                color: Number(color),
                customCategory: customCategory && customCategory !== '' ? customCategory : '',
                frequency,
                shuffle,
                starred,
                date: new Date(),
                endPlayAt: endPlayAt && endPlayAt !== '' ? new Date(endPlayAt) : null,
                channelId,
                createdBy: createdByToUse,
                gradeWeight: Number(gradeWeight),
                deadline: deadline && deadline !== '' ? new Date(deadline) : null,
                initiateAt: initiateAt && initiateAt !== '' ? new Date(initiateAt) : null,
                availableUntil: availableUntil && availableUntil !== '' ? new Date(availableUntil) : null,
                submission,
                allowedAttempts: allowedAttempts === '' ? null : Number(allowedAttempts),
                totalPoints: totalPoints && totalPoints !== '' ? Number(totalPoints) : null,
            };

            const newCue = await CueModel.create({
                ...c,
                limitedShares: limitedShares
                    ? limitedShares
                    : shareWithUserIds !== undefined && shareWithUserIds !== null
                    ? true
                    : false,
            });

            const notificationService = new Expo();
            let userIds: string[] = [];
            const messages: any[] = [];
            const statuses: any[] = [];
            // const tickets = [];
            // const notSetUserIds: any[] = []
            const modifications: any[] = [];

            if (shareWithUserIds !== undefined && shareWithUserIds !== null) {
                // NEED TO ADD CHANNEL CREATOR AND MODERATORS SINCE THEY ARE INCLUDED IN SHARE WITH IDS
                userIds = [...shareWithUserIds, ...ownerIds];

                console.log('All User Ids', userIds);

                userIds.map((userId: string) => {
                    modifications.push({
                        ...c,
                        cueId: newCue._id,
                        userId,
                        graded: false,
                        cue: '',
                    });
                });
            } else {
                const subscriptions = await SubscriptionModel.find({
                    channelId,
                    unsubscribedAt: { $exists: false },
                });

                subscriptions.map((s) => {
                    userIds.push(s.userId);
                });

                // Extra step to prevent duplication in case there are multiple subs created by mistake
                const allUsers = await UserModel.find({ _id: { $in: userIds } });

                allUsers.map((user: any) => {
                    modifications.push({
                        ...c,
                        cueId: newCue._id,
                        userId: user._id,
                        graded: false,
                        cue: '',
                    });
                });
            }
            // insert documents in modifications model
            await ModificationsModel.insertMany(modifications);
            // load subscribers
            const subscribers = await UserModel.find({ _id: { $in: userIds } });

            const activity: any[] = [];

            subscribers.map((sub) => {
                const { title, subtitle: body } = htmlStringParser(cue);
                const notificationIds = sub.notificationId.split('-BREAK-');

                if (submission) {
                    activity.push({
                        userId: sub._id,
                        subtitle: title,
                        title: 'New Assignment created',
                        body,
                        status: 'unread',
                        date: new Date(),
                        channelId,
                        cueId: newCue._id,
                        target: 'CUE',
                    });
                }

                statuses.push({
                    userId: sub._id,
                    channelId,
                    cueId: newCue._id,
                    status: 'delivered',
                });

                notificationIds.map((notifId: any) => {
                    if (!Expo.isExpoPushToken(notifId)) {
                        // notSetUserIds.push(sub._id)
                        return;
                    }
                    messages.push({
                        to: notifId,
                        sound: 'default',
                        subtitle: channel.name + ' - ' + title,
                        title: submission ? 'New Assignment created' : 'New Content shared',
                        body: '',
                        data: { userId: sub._id },
                    });
                });
            });

            await ActivityModel.insertMany(activity);

            await StatusModel.insertMany(statuses);

            // Web notifications

            const oneSignalClient = new OneSignal.Client(
                '78cd253e-262d-4517-a710-8719abf3ee55',
                'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
            );

            const { title } = htmlStringParser(cue);

            const notification = {
                contents: {
                    en: `${channel.name}` + (submission ? ' - New Assignment created ' : ' - New Content ') + title,
                },
                include_external_user_ids: userIds,
            };

            if (userIds.length > 0) {
                const response = await oneSignalClient.createNotification(notification);
            }

            // for user Ids that have no notification receiver attached to them
            // notSetUserIds.map(async uId => {
            // 	await StatusModel.create({
            // 		userId: uId,
            // 		channelId,
            // 		cueId: newCue._id,
            // 		status: 'not-delivered'
            // 	})
            // })

            let chunks = notificationService.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                try {
                    let ticketChunk = await notificationService.sendPushNotificationsAsync(chunk);
                    // tickets.push(...ticketChunk);
                } catch (e) {
                    console.error(e);
                }
            }
            // tickets.map(async (ticket: any, index: any) => {
            // 	await StatusModel.create({
            // 		userId: messages[index].data.userId,
            // 		channelId,
            // 		cueId: newCue._id,
            // 		status: ticket.status === 'ok' ? 'delivered' : 'not-delivered'
            // 	})
            // })

            if (newCue) {
                console.log('New Cue Id', newCue._id);

                const fetchMod = await ModificationsModel.findOne({
                    cueId: newCue._id,
                    userId: createdBy,
                });

                console.log('FETCH MOD', fetchMod);

                return fetchMod;
            }

            return null;
        } catch (e) {
            console.log('Error creating', e);
            return null;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to delete a cue.',
    })
    public async delete(@Arg('cueId', (type) => String) cueId: string) {
        try {
            await CueModel.deleteOne({ _id: cueId });
            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => String, {
        description: 'Used when you want to convert docx to html.',
    })
    public async convertDocxToHtml(@Arg('docx', (type) => String) docx: string) {
        try {
            const mammoth = require('mammoth');
            let err = false;
            const uri = __dirname + '/docs/' + Math.random().toString() + '.docx';
            fs.writeFile(uri, docx, { encoding: 'base64' }, (status) => {
                if (status) {
                    err = true;
                }
            });

            if (err) {
                return 'error';
            }

            const result = await mammoth.convertToHtml(
                { path: uri },
                {
                    convertImage: mammoth.images.dataUri,
                }
            );

            return result.value;
        } catch (e) {
            console.log(e);
            return 'error';
        }
    }

    @Field((type) => Boolean)
    public async saveSubmissionDraft(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('cueId', (type) => String)
        cueId: string,
        @Arg('cue', (type) => String)
        cue: string
    ) {
        try {
            const fetchCue = await CueModel.findById(cueId);

            if (fetchCue && fetchCue.createdBy.toString().trim() !== userId.toString().trim()) {
                //
                const fetchMod = await ModificationsModel.findOne({
                    cueId,
                    userId,
                });

                if (!fetchMod) return false;

                const parseNewDraft = JSON.parse(cue);

                const existingCue = JSON.parse(fetchMod.cue || '{}');

                const existingAttempts = existingCue.attempts ? existingCue.attempts : [];

                const updateCue = {
                    ...parseNewDraft,
                    attempts: existingAttempts,
                };

                console.log('Update Submission cue', updateCue);

                // Update Cue
                await ModificationsModel.updateOne(
                    {
                        cueId,
                        userId,
                    },
                    {
                        cue: JSON.stringify(updateCue),
                    }
                );

                return true;
            } else {
                return false;
            }
        } catch (e) {
            console.log('Error', e);

            return false;
        }
    }

    // USED FOR CREATING LOCAL CUES AND SAVING ALL CUES
    @Field((type) => CueObject, { nullable: true })
    public async handleSaveCue(
        @Arg('cue', (type) => CueInputObject)
        cue: CueInputObject,
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('create', (type) => Boolean)
        create: string
    ) {
        try {
            if (create) {
                if (!cue.channelId || cue.channelId === '') {
                    const c = JSON.parse(JSON.stringify(cue));
                    const newCue = {
                        ...c,
                        channelId: null,
                        createdBy: userId,
                        color: Number(cue.color),
                        date: new Date(),
                        endPlayAt: cue.endPlayAt && cue.endPlayAt !== '' ? new Date(cue.endPlayAt) : null,
                    };
                    delete newCue._id;
                    delete newCue.original;

                    const createNewCue = await CueModel.create(newCue);

                    return createNewCue ? createNewCue : undefined;
                }
                return undefined;
            } else {
                const c = JSON.parse(JSON.stringify(cue));

                // UPDATE CUE
                const updateCue = {
                    ...c,
                    color: Number(cue.color),
                    date: new Date(cue.date),
                    endPlayAt: cue.endPlayAt && cue.endPlayAt !== '' ? new Date(cue.endPlayAt) : null,
                };
                delete updateCue._id;
                let updateRes;

                if (cue.channelId && cue.channelId !== '') {
                    //  now update modifications objects
                    if (cue.createdBy.toString().trim() !== userId.toString().trim()) {
                        // Deleting these because they should not be changed...
                        delete updateCue.deadline;
                        delete updateCue.initiateAt;
                        delete updateCue.gradeWeight;
                        delete updateCue.submission;
                        delete updateCue.allowedAttempts;
                        delete updateCue.availableUntil;
                        delete updateCue.totalPoints;

                        delete updateCue.score;
                        delete updateCue.submittedAt;
                        delete updateCue.createdBy;
                        delete updateCue.graded;
                        delete updateCue.original;
                        // Channel cue
                        const mod = await ModificationsModel.findOne({ userId, cueId: cue._id });
                        if (mod) {
                            // Need to avoid overriding submission and quiz attemps
                            if (mod.submission) {
                                // If cue is empty then no need to check for updating Annotations
                                try {
                                    const newCue = JSON.parse(updateCue.cue);

                                    if (
                                        newCue.attempts &&
                                        newCue.attempts.length !== 0 &&
                                        !newCue.quizResponses &&
                                        mod.cue
                                    ) {
                                        // If it's a submission then we need to update the Annotations

                                        // const currCueValue = mod.cue;

                                        // const obj = JSON.parse(currCueValue);

                                        // const newAttempt = newCue.attempts[newCue.attempts.length - 1];

                                        // const currAttempt = obj.attempts[obj.attempts.length - 1];

                                        // currAttempt.annotations = newAttempt.annotations;

                                        // const allAttempts = [...obj.attempts];

                                        // allAttempts[allAttempts.length - 1] = currAttempt;

                                        // console.log('Update annotation', newAttempt.annotations);

                                        // const updateCue = {
                                        //     attempts: allAttempts,
                                        //     submissionDraft: obj.submissionDraft,
                                        // };

                                        delete updateCue.cue;

                                        updateRes = await ModificationsModel.updateOne(
                                            {
                                                cueId: cue._id,
                                                userId,
                                            },
                                            {
                                                ...updateCue,
                                                // cue: JSON.stringify(updateCue),
                                            }
                                        );
                                    } else {
                                        // Quiz so no annotations
                                        delete updateCue.cue;

                                        updateRes = await ModificationsModel.updateOne(
                                            {
                                                cueId: cue._id,
                                                userId,
                                            },
                                            {
                                                ...updateCue,
                                            }
                                        );
                                    }
                                } catch (e) {
                                    delete updateCue.cue;

                                    updateRes = await ModificationsModel.updateOne(
                                        {
                                            cueId: cue._id,
                                            userId,
                                        },
                                        {
                                            ...updateCue,
                                        }
                                    );

                                    return;
                                }
                            } else {
                                // update modified
                                updateRes = await ModificationsModel.updateOne(
                                    {
                                        cueId: cue._id,
                                        userId,
                                    },
                                    {
                                        ...updateCue,
                                    }
                                );
                            }
                        } else {
                            // the cue was deleted by owner. do nothing.
                        }
                    } else {
                        // update all modification objects with that particular CueId along with details to original one
                        const subscribers: any[] = await SubscriptionModel.find({
                            channelId: cue.channelId,
                            unsubscribedAt: { $exists: false },
                        });
                        const userIds: any[] = [];
                        subscribers.map((s) => {
                            const sub = s.toObject();
                            userIds.push(sub.userId);
                        });

                        delete updateCue.score;
                        delete updateCue.graded;
                        delete updateCue.submittedAt;
                        delete updateCue.createdBy;
                        const tempCue = updateCue.cue;
                        const tempOriginal = updateCue.original;
                        delete updateCue.cue;
                        delete updateCue.original;
                        const tempAnnotations = updateCue.annotations;
                        delete updateCue.annotations;

                        if (tempOriginal === undefined || tempOriginal === null) {
                            await CueModel.updateOne(
                                {
                                    _id: cue._id,
                                },
                                {
                                    ...updateCue,
                                    gradeWeight:
                                        updateCue.submission && updateCue.gradeWeight
                                            ? Number(updateCue.gradeWeight)
                                            : undefined,
                                    allowedAttempts: updateCue.allowedAttempts
                                        ? Number(updateCue.allowedAttempts)
                                        : null,
                                    totalPoints:
                                        updateCue.submission && updateCue.totalPoints
                                            ? Number(updateCue.totalPoints)
                                            : undefined,
                                }
                            );
                        } else {
                            await CueModel.updateOne(
                                {
                                    _id: cue._id,
                                },
                                {
                                    ...updateCue,
                                    cue: tempOriginal,
                                    gradeWeight:
                                        updateCue.submission && updateCue.gradeWeight
                                            ? Number(updateCue.gradeWeight)
                                            : undefined,
                                    allowedAttempts: updateCue.allowedAttempts
                                        ? Number(updateCue.allowedAttempts)
                                        : null,
                                    totalPoints:
                                        updateCue.submission && updateCue.totalPoints
                                            ? Number(updateCue.totalPoints)
                                            : undefined,
                                }
                            );
                        }
                        const updates = await ModificationsModel.updateMany(
                            {
                                cueId: cue._id,
                                userId: { $in: userIds },
                            },
                            {
                                ...updateCue,
                                gradeWeight:
                                    updateCue.submission && updateCue.gradeWeight
                                        ? Number(updateCue.gradeWeight)
                                        : undefined,
                                allowedAttempts: updateCue.allowedAttempts ? Number(updateCue.allowedAttempts) : null,
                                totalPoints:
                                    updateCue.submission && updateCue.totalPoints
                                        ? Number(updateCue.totalPoints)
                                        : undefined,
                            }
                        );
                        // get the cue back to the main owner
                        updateRes = await ModificationsModel.updateOne(
                            { cueId: cue._id, userId },
                            { cue: tempCue, annotations: tempAnnotations }
                        );
                    }

                    if (updateRes) {
                        const fetchModified = await ModificationsModel.findOne({
                            cueId: cue._id,
                            userId,
                        });

                        if (fetchModified) return fetchModified;
                    }
                } else {
                    // Local cue

                    // update the cue
                    updateRes = await CueModel.updateOne({ _id: cue._id }, { ...updateCue });

                    if (updateRes.n) {
                        const fetchModified = await CueModel.findById(cue._id);

                        if (fetchModified) return fetchModified;
                    }
                }

                console.log('Update Res', updateRes);

                return null;
            }
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }

    @Field((type) => [IDMapObject])
    public async saveCuesToCloud(
        @Arg('cues', (type) => [CueInputObject])
        cues: [CueInputObject],
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            // make sure dates are saved correctly
            const idMap: any[] = [];
            const toBeCreated: any[] = [];
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
                            endPlayAt: cue.endPlayAt && cue.endPlayAt !== '' ? new Date(cue.endPlayAt) : null,
                        };
                        delete c._id;
                        delete c.original;
                        toBeCreated.push(c);
                        idMap.push({
                            oldId: cue._id,
                            newId: '',
                        });
                    }
                }
            });
            const newCues = await CueModel.insertMany(toBeCreated);
            newCues.map((item: any, index: number) => {
                idMap[index].newId = item._id;
            });
            cues.map(async (cue: any) => {
                const c = {
                    ...cue,
                    color: Number(cue.color),
                    date: new Date(cue.date),
                    endPlayAt: cue.endPlayAt && cue.endPlayAt !== '' ? new Date(cue.endPlayAt) : null,
                };
                delete c._id;
                if (cue.channelId && cue.channelId !== '') {
                    //  now update modifications objects
                    if (cue.createdBy.toString().trim() !== userId.toString().trim()) {
                        // Deleting these because they should not be changed...
                        delete c.deadline;
                        delete c.initiateAt;
                        delete c.gradeWeight;
                        delete c.submission;
                        delete c.allowedAttempts;
                        delete c.availableUntil;
                        delete c.totalPoints;

                        delete c.score;
                        delete c.submittedAt;
                        delete c.createdBy;
                        delete c.graded;
                        delete c.original;
                        // Channel cue
                        const mod = await ModificationsModel.findOne({ userId, cueId: cue._id });
                        if (mod) {
                            // Need to avoid overriding submission and quiz attemps

                            if (mod.submission) {
                                // If cue is empty then no need to check for updating Annotations
                                try {
                                    // console.log('C.Cue', c.cue);

                                    const newCue = JSON.parse(c.cue);

                                    if (
                                        newCue.attempts &&
                                        newCue.attempts.length !== 0 &&
                                        !newCue.quizResponses &&
                                        mod.cue
                                    ) {
                                        // If it's a submission then we need to update the Annotations

                                        // const currCueValue = mod.cue;

                                        // const obj = JSON.parse(currCueValue);

                                        // const newAttempt = newCue.attempts[newCue.attempts.length - 1];

                                        // const currAttempt = obj.attempts[obj.attempts.length - 1];

                                        // currAttempt.annotations = newAttempt.annotations;

                                        // const allAttempts = [...obj.attempts];

                                        // allAttempts[allAttempts.length - 1] = currAttempt;

                                        // console.log('Update annotation', newAttempt.annotations);

                                        // const updateCue = {
                                        //     attempts: allAttempts,
                                        //     submissionDraft: obj.submissionDraft,
                                        // };

                                        delete c.cue;

                                        await ModificationsModel.updateOne(
                                            {
                                                cueId: cue._id,
                                                userId,
                                            },
                                            {
                                                ...c,
                                                // cue: JSON.stringify(updateCue),
                                            }
                                        );
                                    } else {
                                        // Quiz so no annotations
                                        delete c.cue;

                                        await ModificationsModel.updateOne(
                                            {
                                                cueId: cue._id,
                                                userId,
                                            },
                                            {
                                                ...c,
                                            }
                                        );
                                    }
                                } catch (e) {
                                    delete c.cue;

                                    await ModificationsModel.updateOne(
                                        {
                                            cueId: cue._id,
                                            userId,
                                        },
                                        {
                                            ...c,
                                        }
                                    );

                                    return;
                                }
                            } else {
                                // update modified
                                await ModificationsModel.updateOne(
                                    {
                                        cueId: cue._id,
                                        userId,
                                    },
                                    {
                                        ...c,
                                    }
                                );
                            }
                        } else {
                            // the cue was deleted by owner. do nothing.
                        }
                    } else {
                        // update all modification objects with that particular CueId along with details to original one
                        const subscribers: any[] = await SubscriptionModel.find({
                            channelId: cue.channelId,
                            unsubscribedAt: { $exists: false },
                        });
                        const userIds: any[] = [];
                        subscribers.map((s) => {
                            const sub = s.toObject();
                            userIds.push(sub.userId);
                        });

                        delete c.score;
                        delete c.graded;
                        delete c.submittedAt;
                        delete c.createdBy;
                        const tempCue = c.cue;
                        const tempOriginal = c.original;
                        delete c.cue;
                        delete c.original;
                        const tempAnnotations = c.annotations;
                        delete c.annotations;

                        if (tempOriginal === undefined || tempOriginal === null) {
                            await CueModel.updateOne(
                                {
                                    _id: cue._id,
                                },
                                {
                                    ...c,
                                    gradeWeight: c.submission && c.gradeWeight ? Number(c.gradeWeight) : undefined,
                                    allowedAttempts: c.allowedAttempts ? Number(c.allowedAttempts) : null,
                                    totalPoints: c.submission && c.totalPoints ? Number(c.totalPoints) : undefined,
                                }
                            );
                        } else {
                            await CueModel.updateOne(
                                {
                                    _id: cue._id,
                                },
                                {
                                    ...c,
                                    cue: tempOriginal,
                                    gradeWeight: c.submission && c.gradeWeight ? Number(c.gradeWeight) : undefined,
                                    allowedAttempts: c.allowedAttempts ? Number(c.allowedAttempts) : null,
                                    totalPoints: c.submission && c.totalPoints ? Number(c.totalPoints) : undefined,
                                }
                            );
                        }
                        const updates = await ModificationsModel.updateMany(
                            {
                                cueId: cue._id,
                                userId: { $in: userIds },
                            },
                            {
                                ...c,
                                gradeWeight: c.submission && c.gradeWeight ? Number(c.gradeWeight) : undefined,
                                allowedAttempts: c.allowedAttempts ? Number(c.allowedAttempts) : null,
                                totalPoints: c.submission && c.totalPoints ? Number(c.totalPoints) : undefined,
                            }
                        );
                        // get the cue back to the main owner
                        await ModificationsModel.updateOne(
                            { cueId: cue._id, userId },
                            { cue: tempCue, annotations: tempAnnotations }
                        );
                    }
                } else {
                    // Local cue
                    if (Number.isNaN(Number(cue._id))) {
                        // update the cue
                        await CueModel.updateOne({ _id: cue._id }, { ...c });
                    }
                }
            });
            return idMap;
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => Boolean)
    public async deleteForEveryone(
        @Arg('cueId', (type) => String)
        cueId: string
    ) {
        try {
            const cueToDelete = await CueModel.findById(cueId);

            if (!cueToDelete) return false;

            await ModificationsModel.deleteMany({ cueId });
            await CueModel.deleteOne({ _id: cueId });

            // Pull cue from folder
            await FolderModel.updateOne(
                {
                    _id: cueToDelete.folderId,
                },
                {
                    $pull: { cueIds: cueToDelete._id },
                }
            );

            // Delete all activity
            await ActivityModel.deleteMany({
                cueId,
            });

            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean)
    public async submitModification(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('cueId', (type) => String)
        cueId: string,
        @Arg('cue', (type) => String)
        cue: string,
        @Arg('quizId', (type) => String, { nullable: true })
        quizId?: string
    ) {
        try {
            const mod = await ModificationsModel.findOne({ cueId, userId });

            if (!mod) return false;
            // if (mod) {
            // 	const modification = mod.toObject()
            // 	if (modification.submittedAt !== undefined && modification.submittedAt !== null) {
            // 		// already submitted
            // 		return true;
            // 	}
            // }

            let isQuizFullyGraded = false;

            if (quizId !== undefined && quizId !== null) {
                const solutionsObject = JSON.parse(cue);
                const solutions = solutionsObject.solutions;
                // grade submission over here
                const quizDoc: any = await QuizModel.findById(quizId);
                let score = 0;
                let total = 0;
                const quiz = quizDoc.toObject();

                let isSubjective = false;

                // Add an array for Individual Scores for era
                solutionsObject.problemScores = [];

                quiz.problems.forEach((problem: any, i: any) => {
                    // Increment total points
                    total += problem.points !== null && problem.points !== undefined ? problem.points : 1;

                    // Add more types here which require checking
                    if (problem.questionType && problem.questionType === 'freeResponse') {
                        isSubjective = true;
                        solutionsObject.problemScores.push('');
                        return;
                    }

                    // Drag & Drop

                    if (problem.questionType && problem.questionType === 'dragdrop') {
                        let correctAnswers = 0;
                        let totalAnswers = 0;

                        problem.dragDropData.map((group: any[]) => {
                            totalAnswers += group.length;
                        });

                        const gradedDragDropChoices: any[] = [];

                        solutions[i].dragDropChoices.map((group: any[], ind: number) => {
                            const gradedGroup: any[] = [];

                            group.map((label: any) => {
                                const correct = problem.dragDropData[ind].find((val: any) => {
                                    return val.id === label.id;
                                });

                                if (correct && correct.id) {
                                    gradedGroup.push({
                                        id: label.id,
                                        content: label.content,
                                        correct: true,
                                    });

                                    correctAnswers += 1;
                                } else {
                                    gradedGroup.push({
                                        id: label.id,
                                        content: label.content,
                                        correct: false,
                                    });
                                }
                            });

                            gradedDragDropChoices.push(gradedGroup);
                        });

                        solutions[i].dragDropChoices = gradedDragDropChoices;

                        console.log('gradedDragDropChoices', gradedDragDropChoices);

                        const calculatedScore = (
                            (correctAnswers / totalAnswers) *
                            (problem.points !== undefined && problem.points !== null ? problem.points : 1)
                        ).toFixed(2);

                        solutionsObject.problemScores.push(calculatedScore);
                        score += Number(calculatedScore);

                        return;
                    }

                    // Highlight Text

                    if (problem.questionType && problem.questionType === 'highlightText') {
                        let correctAnswers = 0;
                        let totalAnswers = 0;

                        problem.highlightTextChoices.map((choice: boolean, ind: number) => {
                            if (choice) {
                                totalAnswers += 1;

                                if (solutions[i].highlightTextSelection[ind]) {
                                    correctAnswers += 1;
                                }
                            }
                        });

                        const calculatedScore = (
                            (correctAnswers / totalAnswers) *
                            (problem.points !== undefined && problem.points !== null ? problem.points : 1)
                        ).toFixed(2);

                        solutionsObject.problemScores.push(calculatedScore);
                        score += Number(calculatedScore);

                        return;
                    }

                    // Hotspot

                    if (problem.questionType && problem.questionType === 'hotspot') {
                        const hotspotSelections = solutions[i].hotspotSelection;

                        let correctAnswers = 0;
                        let totalAnswers = 0;

                        problem.hotspotOptions.map((option: any, ind: number) => {
                            if (option.isCorrect) {
                                totalAnswers += 1;
                            }

                            if (option.isCorrect && hotspotSelections[ind]) {
                                correctAnswers += 1;
                            }
                        });

                        console.log('Hotspot correct answers', correctAnswers);
                        console.log('Hotspot Total answers', totalAnswers);

                        const calculatedScore = (
                            (correctAnswers / totalAnswers) *
                            (problem.points !== undefined && problem.points !== null ? problem.points : 1)
                        ).toFixed(2);

                        solutionsObject.problemScores.push(calculatedScore);
                        score += Number(calculatedScore);

                        return;
                    }

                    // Inline choice

                    if (problem.questionType && problem.questionType === 'inlineChoice') {
                        const inlineChoiceSelection = solutions[i].inlineChoiceSelection;

                        const totalAnswers = problem.inlineChoiceOptions.length;

                        let correctAnswers = 0;

                        problem.inlineChoiceOptions.map((choice: any, ind: number) => {
                            let isCorrectChosen = false;

                            choice.map((option: any) => {
                                if (option.option === inlineChoiceSelection[ind] && option.isCorrect) {
                                    isCorrectChosen = true;
                                }
                            });

                            if (isCorrectChosen) {
                                correctAnswers += 1;
                            }
                        });

                        console.log('Correct answers Inline choice', correctAnswers);

                        const calculatedScore = (
                            (correctAnswers / totalAnswers) *
                            (problem.points !== undefined && problem.points !== null ? problem.points : 1)
                        ).toFixed(2);

                        solutionsObject.problemScores.push(calculatedScore);
                        score += Number(calculatedScore);

                        return;
                    }

                    // Text Entry
                    if (problem.questionType && problem.questionType === 'textEntry') {
                        const textEntrySelection = solutions[i].textEntrySelection;

                        let totalPoints = 0;
                        let correctPoints = 0;

                        problem.textEntryOptions.map((option: any, optionIndex: number) => {
                            totalPoints += option.points;

                            // Type checks will only be performed on the frontend
                            if (
                                option.option
                                    .toString()
                                    .trim()
                                    .toLowerCase() ===
                                textEntrySelection[optionIndex]
                                    .toString()
                                    .trim()
                                    .toLowerCase()
                            ) {
                                correctPoints += option.points;
                            }
                        });

                        console.log('Text entry total points', totalPoints);
                        console.log('Text entry correct points', correctPoints);

                        const calculatedScore = (
                            (correctPoints / totalPoints) *
                            (problem.points !== undefined && problem.points !== null ? problem.points : 1)
                        ).toFixed(2);

                        solutionsObject.problemScores.push(calculatedScore);
                        score += Number(calculatedScore);

                        return;
                    }

                    // Multipart
                    if (problem.questionType && problem.questionType === 'multipart') {
                        const multipartSelection = solutions[i].multipartSelection;

                        // Part A
                        let correctAnswers = 0;
                        let totalAnswers = 0;

                        problem.multipartOptions[0].map((option: any, optionIndex: number) => {
                            if (option.isCorrect) {
                                totalAnswers += 1;
                            }

                            if (option.isCorrect && multipartSelection[0][optionIndex]) {
                                correctAnswers += 1;
                            }
                        });

                        let partAScore =
                            (correctAnswers / totalAnswers) *
                            (problem.points !== undefined && problem.points !== null ? problem.points : 1);

                        console.log('Part A Score', partAScore);

                        correctAnswers = 0;
                        totalAnswers = 0;

                        problem.multipartOptions[1].map((option: any, optionIndex: number) => {
                            if (option.isCorrect) {
                                totalAnswers += 1;
                            }

                            if (option.isCorrect && multipartSelection[1][optionIndex]) {
                                correctAnswers += 1;
                            }
                        });

                        let partBScore =
                            (correctAnswers / totalAnswers) *
                            (problem.points !== undefined && problem.points !== null ? problem.points : 1);

                        console.log('Part B Score', partBScore);

                        const calculatedScore = ((partAScore + partBScore) / 2).toFixed(2);

                        console.log('Multipart score', calculatedScore);

                        solutionsObject.problemScores.push(calculatedScore);
                        score += Number(calculatedScore);

                        return;
                    }

                    // Equation Editor
                    if (problem.questionType && problem.questionType === 'equationEditor') {
                        const equationResponse = solutions[i].equationResponse;

                        let isCorrect = false;

                        problem.correctEquations.map((equation: any, equationIndex: number) => {
                            // Need to perform check to remove spaces from both Latex formulas
                            if (equation === equationResponse) {
                                isCorrect = true;
                            }
                        });

                        if (isCorrect) {
                            const calculatedScore = isCorrect
                                ? (problem.points !== undefined && problem.points !== null
                                      ? problem.points
                                      : 1
                                  ).toFixed(2)
                                : '0';
                            solutionsObject.problemScores.push(calculatedScore);
                            score += Number(calculatedScore);
                        } else {
                            isSubjective = true;
                            solutionsObject.problemScores.push('');
                        }

                        // This can be used as a checkbox by instructor to manually override autograding
                        solutionsObject.solutions[i].isEquationResponseCorrect = isCorrect;
                        return;
                    }

                    // Match Table Grid

                    if (problem.questionType && problem.questionType === 'matchTableGrid') {
                        const matchTableSelection = solutions[i].matchTableSelection;

                        let totalAnswers = problem.matchTableChoices.length;

                        let correctAnswers = 0;

                        problem.matchTableChoices.map((row: any, rowIndex: number) => {
                            let correctSelected = false;

                            row.map((option: boolean, optionIndex: number) => {
                                if (option && matchTableSelection[rowIndex][optionIndex]) {
                                    correctSelected = true;
                                }
                            });

                            if (correctSelected) {
                                correctAnswers += 1;
                            }
                        });

                        const calculatedScore = (
                            (correctAnswers / totalAnswers) *
                            (problem.points !== undefined && problem.points !== null ? problem.points : 1)
                        ).toFixed(2);

                        solutionsObject.problemScores.push(calculatedScore);
                        score += Number(calculatedScore);

                        return;
                    }

                    // Add check for partial grading later for MCQs
                    let correctAnswers = 0;
                    let totalAnswers = 0;

                    problem.options.map((option: any, j: any) => {
                        if (option.isCorrect && solutions[i].selected[j].isSelected) {
                            // correct answers
                            correctAnswers += 1;
                        }
                        // TO FIX
                        if (option.isCorrect) {
                            // total correct answers
                            totalAnswers += 1;
                        }
                        // if (!option.isCorrect && solutions[i].selected[j].isSelected) {
                        //     // to deduct points if answer is not correct but selected
                        //     totalAnswers += 1;
                        // }
                    });

                    const calculatedScore = (
                        (correctAnswers / totalAnswers) *
                        (problem.points !== undefined && problem.points !== null ? problem.points : 1)
                    ).toFixed(2);

                    solutionsObject.problemScores.push(calculatedScore);
                    score += Number(calculatedScore);
                });

                solutionsObject.submittedAt = new Date();
                solutionsObject.score = score;
                solutionsObject.isActive = false;
                solutionsObject.isFullyGraded = !isSubjective;

                // If not subjective then graded should be set to true
                isQuizFullyGraded = !isSubjective;

                // New MULTIPLE ATTEMPTS SCHEMA

                // For each attempt need to store the solutions, initiatedAt, problemScores, problemComments, submittedAt, score, isActive (This Quiz Attempt is used as the main score), attemptScore (This will be used to compare each attempt), isFullyGraded (set submission to not graded false and set as active)  ;
                let saveCue: any = mod.cue && mod.cue !== '' ? JSON.parse(mod.cue) : { attempts: [] };
                // let saveCue: any = { attempts: [] }

                // Add the new attempt
                saveCue.attempts.push(solutionsObject);

                // Update the older attempts and calculate which attempt should be active
                let highestScore = 0;
                let bestAttempt = 0;
                let currActiveAttempt = 0;
                let highestPointsScored = 0;

                saveCue.attempts.map((attempt: any, index: number) => {
                    if (attempt.score >= highestScore) {
                        highestScore = attempt.score;

                        let calculateTotal = 0;

                        attempt.problemScores.map((points: string) => {
                            if (points !== '') {
                                calculateTotal += Number(points);
                            }
                        });

                        calculateTotal = Math.round((calculateTotal + Number.EPSILON) * 100) / 100;

                        highestPointsScored = calculateTotal;

                        bestAttempt = index;
                    }

                    if (attempt.isActive) {
                        currActiveAttempt = index;
                    }
                });

                if (bestAttempt !== currActiveAttempt) {
                    saveCue.attempts[currActiveAttempt] = {
                        ...saveCue.attempts[currActiveAttempt],
                        isActive: false,
                    };
                }

                saveCue.attempts[bestAttempt] = {
                    ...saveCue.attempts[bestAttempt],
                    isActive: true,
                };

                saveCue.quizResponses = '';

                isQuizFullyGraded = saveCue.attempts[bestAttempt].isFullyGraded;

                const quizUpdate = await ModificationsModel.updateOne(
                    { cueId, userId },
                    {
                        submittedAt: new Date(),
                        cue: JSON.stringify(saveCue),
                        graded: isQuizFullyGraded,
                        score: Number(((highestScore / total) * 100).toFixed(2)),
                        pointsScored: highestPointsScored,
                    }
                );
                console.log('Quiz Update', quizUpdate);
                console.log('Time ', new Date().toUTCString());
            } else {
                // Get current submissions object from modification

                let saveCue: any = mod.cue && mod.cue !== '' ? JSON.parse(mod.cue) : { attempts: [] };

                // const submissions = mod.cue ? JSON.parse(mod.cue) : saveSubmission;

                // Assignment Submissions (Store multiple submissions)
                if (cue[0] === '{' && cue[cue.length - 1] === '}') {
                    // Submission is already a file upload
                    const obj = JSON.parse(cue);

                    let saveSubmission = {
                        url: obj.url,
                        type: obj.type,
                        title: obj.title,
                        submittedAt: new Date(),
                        isActive: true,
                        annotations: obj.annotations ? obj.annotations : '',
                    };

                    const currentAttemps: any[] = [...saveCue.attempts];

                    // Set the past attempts to inactive
                    const updatedAttempts = currentAttemps.map((attempt: any) => {
                        return {
                            ...attempt,
                            isActive: false,
                        };
                    });

                    updatedAttempts.push(saveSubmission);

                    saveCue.attempts = updatedAttempts;

                    saveCue.submissionDraft = '';
                } else {
                    const getHTMLToPDF = async (html: any) => {
                        try {
                            AWS.config.update({
                                accessKeyId: 'AKIAJS2WW55SPDVYG2GQ',
                                secretAccessKey: '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',
                            });

                            const s3 = new AWS.S3();

                            const createPDF = pdf.create(html);
                            var pdfToStream = Promise.promisify(createPDF.toStream, { context: createPDF });

                            const res = await pdfToStream();

                            const uploadParams = {
                                Bucket: 'cues-files',
                                Key: 'media/pdf/' + Date.now() + '_' + 'something.pdf',
                                Body: res,
                            };

                            const data = await s3.upload(uploadParams).promise();

                            return data.Location;
                        } catch (err) {
                            console.log('Error processing request: ' + err);
                            return '';
                        }
                    };
                    // Convert html submission into pdf
                    const pdfPath = await getHTMLToPDF(cue);

                    let saveSubmission = {
                        html: cue,
                        submittedAt: new Date(),
                        isActive: true,
                        annotationPDF: pdfPath,
                        annotations: '',
                    };

                    const currentAttemps: any[] = [...saveCue.attempts];

                    // Set the past attempts to inactive
                    const updatedAttempts = currentAttemps.map((attempt: any) => {
                        return {
                            ...attempt,
                            isActive: false,
                        };
                    });

                    updatedAttempts.push(saveSubmission);

                    saveCue.attempts = updatedAttempts;

                    saveCue.submissionDraft = '';

                    console.log(saveCue);
                }

                // Convert html submission into pdf

                await ModificationsModel.updateOne(
                    { cueId, userId },
                    { submittedAt: new Date(), cue: JSON.stringify(saveCue) }
                );
            }

            const c: any = await CueModel.findById(cueId);
            const channel: any = await ChannelModel.findById(c.channelId);
            const user: any = await UserModel.findById(userId);
            const messages: any[] = [];
            const notificationService = new Expo();

            const notificationIds = user.notificationId.split('-BREAK-');
            const { title } = htmlStringParser(c.cue);

            notificationIds.map((notifId: any) => {
                if (!Expo.isExpoPushToken(notifId)) {
                    return;
                }
                messages.push({
                    to: notifId,
                    sound: 'default',
                    subtitle: title + ' - ' + channel.name,
                    title: 'Submission Complete',
                    data: { userId: user._id },
                });
            });
            const activity = {
                userId,
                subtitle: title,
                title: 'Submission Complete',
                status: 'unread',
                date: new Date(),
                channelId: c.channelId,
                cueId,
                target: 'CUE',
            };
            await ActivityModel.create(activity);

            // Web notifications

            const oneSignalClient = new OneSignal.Client(
                '78cd253e-262d-4517-a710-8719abf3ee55',
                'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
            );

            const notification = {
                contents: {
                    en:
                        `${channel.name}` +
                        (quizId !== undefined && quizId !== null && isQuizFullyGraded ? 'Graded! ' : 'Submitted! ') +
                        title,
                },
                include_external_user_ids: [user._id],
            };

            const response = await oneSignalClient.createNotification(notification);

            let chunks = notificationService.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                try {
                    await notificationService.sendPushNotificationsAsync(chunk);
                } catch (e) {
                    console.error(e);
                }
            }
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean)
    public async updateAnnotation(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('cueId', (type) => String)
        cueId: string,
        @Arg('annotations', (type) => String)
        annotations: string
    ) {
        try {
            console.log('Incoming annotation', annotations);

            const mod = await ModificationsModel.findOne({ cueId, userId });

            if (!mod || !mod.cue) return false;

            const currCue = JSON.parse(mod.cue);

            const currAttempt = currCue.attempts[currCue.attempts.length - 1];

            currAttempt.annotations = annotations;

            const allAttempts = [...currCue.attempts];

            allAttempts[allAttempts.length - 1] = currAttempt;

            const updateCue = {
                attempts: allAttempts,
                submissionDraft: currCue.submissionDraft,
            };

            const updateAnnotation = await ModificationsModel.updateOne(
                {
                    _id: mod._id,
                },
                {
                    cue: JSON.stringify(updateCue),
                }
            );

            console.log('Update annotations', updateAnnotation);

            return true;
        } catch (e) {
            console.log('error', e);
            return false;
        }
    }

    @Field((type) => Boolean)
    public async gradeQuiz(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('cueId', (type) => String)
        cueId: string,
        @Arg('problemScores', (type) => [String]!)
        problemScores: string[],
        @Arg('problemComments', (type) => [String]!)
        problemComments: string[],
        @Arg('score', (type) => Number, { nullable: true })
        score?: number,
        @Arg('comment', (type) => String, { nullable: true })
        comment?: string,
        @Arg('quizAttempt', (type) => Number, { nullable: true })
        quizAttempt?: number
    ) {
        try {
            const mod = await ModificationsModel.findOne({ cueId, userId });

            if (!mod || !mod.cue) return false;

            if (quizAttempt !== null && quizAttempt !== undefined) {
                const currCueValue = JSON.parse(mod.cue);

                const currAttempts = currCueValue.attempts;

                const attemptToGrade = currAttempts[quizAttempt];

                let attemptScore = 0;

                problemScores.forEach((score) => {
                    if (score && score !== '') {
                        attemptScore += parseFloat(score);
                    }
                });

                let updatedAttempts = [...currAttempts];

                updatedAttempts[quizAttempt] = { ...attemptToGrade };

                let calculateTotal = 0;

                problemScores.map((points: string) => {
                    if (points !== '') {
                        calculateTotal += Number(points);
                    }
                });

                calculateTotal = Math.round((calculateTotal + Number.EPSILON) * 100) / 100;

                updatedAttempts[quizAttempt].problemScores = problemScores;
                updatedAttempts[quizAttempt].problemComments = problemComments;
                updatedAttempts[quizAttempt].isFullyGraded = true;
                updatedAttempts[quizAttempt].score = attemptScore;

                let isActiveAttemptFullyGraded = false;

                let activeAttempt = 0;

                updatedAttempts.map((attempt: any, index: number) => {
                    if (attempt.isActive && attempt.isFullyGraded) isActiveAttemptFullyGraded = true;

                    if (attempt.isActive) activeAttempt = index;
                });

                const updatedCue = { ...currCueValue };
                updatedCue.attempts = updatedAttempts;

                // Only update the score && graded if the active attempt is modified

                const update = await ModificationsModel.updateOne(
                    {
                        cueId,
                        userId,
                    },
                    {
                        score: activeAttempt === quizAttempt ? Number(score) : mod.score,
                        pointsScored: activeAttempt === quizAttempt ? calculateTotal : mod.pointsScored,
                        comment: comment && comment !== '' ? comment : '',
                        graded: isActiveAttemptFullyGraded,
                        cue: JSON.stringify(updatedCue),
                    }
                );

                return true;
            } else {
                const submissionObj = JSON.parse(mod.cue);

                submissionObj.problemScores = problemScores;
                submissionObj.problemComments = problemComments;

                const update = await ModificationsModel.updateOne(
                    {
                        cueId,
                        userId,
                    },
                    {
                        score: Number(score),
                        comment: comment && comment !== '' ? comment : '',
                        graded: true,
                        cue: JSON.stringify(submissionObj),
                    }
                );

                return true;
            }
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean)
    public async modifyActiveAttemptQuiz(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('cueId', (type) => String)
        cueId: string,
        @Arg('quizAttempt', (type) => Number, { nullable: true })
        quizAttempt?: number
    ) {
        const mod = await ModificationsModel.findOne({ cueId, userId });

        if (!mod || !mod.cue) return false;

        const cue = await CueModel.findById(mod.cueId);

        if (!cue) return false;

        const original = cue.cue;

        const obj = JSON.parse(original);

        if (obj.quizId === undefined || obj.quizId === '') {
            return false;
        }

        const quiz = await QuizModel.findById(obj.quizId);

        if (!quiz) return false;

        let total = 0;

        quiz.problems.forEach((problem: any, i: any) => {
            // Increment total points
            total += problem.points !== null && problem.points !== undefined ? problem.points : 1;
        });

        const currCue = JSON.parse(mod.cue);

        let scoreToSet = 0;

        let isNewAttemptFullyGraded = false;

        const updatedAttempts = currCue.attempts.map((attempt: any, index: number) => {
            if (quizAttempt === index) {
                if (attempt.isFullyGraded) isNewAttemptFullyGraded = true;

                scoreToSet = attempt.score;

                return {
                    ...attempt,
                    isActive: true,
                };
            }

            return {
                ...attempt,
                isActive: false,
            };
        });

        // console.log("Updated Cue", {
        // 	graded: isNewAttemptFullyGraded,
        // 	cue: JSON.stringify({
        // 		...currCue,
        // 		attempts: updatedAttempts,
        // 	}),
        // 	score:  Number(((scoreToSet/total) * 100).toFixed(2))
        // })

        const update = await ModificationsModel.updateOne(
            {
                cueId,
                userId,
            },
            {
                graded: isNewAttemptFullyGraded,
                cue: JSON.stringify({
                    ...currCue,
                    attempts: updatedAttempts,
                }),
                score: Number(((scoreToSet / total) * 100).toFixed(2)),
            }
        );

        return true;
    }

    @Field((type) => Boolean)
    public async submitGrade(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('cueId', (type) => String)
        cueId: string,
        @Arg('pointsScored', (type) => String)
        pointsScored: string,
        @Arg('comment', (type) => String, { nullable: true })
        comment?: string
    ) {
        try {
            const cue: any = await CueModel.findById(cueId);
            const channel: any = await ChannelModel.findById(cue.channelId);
            const totalPossible = cue.totalPoints ? Number(cue.totalPoints) : 100;
            const updatePoints = Number(pointsScored);

            const calculateScore = (updatePoints / totalPossible) * 100;

            const roundScore = Math.round((calculateScore + Number.EPSILON) * 100) / 100;

            await ModificationsModel.updateOne(
                { cueId, userId },
                {
                    pointsScored: updatePoints,
                    score: roundScore,
                    comment: comment && comment !== '' ? comment : '',
                    graded: true,
                }
            );
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean)
    public async editReleaseSubmission(
        @Arg('cueId', (type) => String)
        cueId: string,
        @Arg('releaseSubmission', (type) => Boolean)
        releaseSubmission: boolean
    ) {
        try {
            const updateCue = await CueModel.updateOne(
                {
                    _id: cueId,
                },
                {
                    releaseSubmission,
                }
            );

            const updateModifications = await ModificationsModel.updateMany(
                {
                    cueId,
                },
                {
                    releaseSubmission,
                }
            );

            const fetchCue = await CueModel.findById(cueId);

            // Add notification here for releasing Submission => If graded say that Grades available or else submission available
            if (releaseSubmission && fetchCue) {
                const { submission, channelId, gradeWeight, cue } = fetchCue;

                const notificationService = new Expo();
                let userIds: string[] = [];
                const messages: any[] = [];

                const fetchChannel = await ChannelModel.findById(channelId);

                if (!fetchChannel || !submission) return;

                const subscriptions = await SubscriptionModel.find({
                    $and: [{ channelId }, { unsubscribedAt: { $exists: false } }],
                });

                subscriptions.map((s) => {
                    userIds.push(s.userId);
                });

                const { title, subtitle: body } = htmlStringParser(cue);

                const subscribers = await UserModel.find({ _id: { $in: userIds } });
                const activity: any[] = [];

                subscribers.map((sub) => {
                    const notificationIds = sub.notificationId.split('-BREAK-');
                    notificationIds.map((notifId: any) => {
                        if (!Expo.isExpoPushToken(notifId)) {
                            return;
                        }
                        messages.push({
                            to: notifId,
                            sound: 'default',
                            subtitle: title,
                            title: fetchChannel.name + ' - ' + title + ' ',
                            body:
                                submission && gradeWeight && gradeWeight > 0 ? ' Grades available' : 'Scores available',
                            data: { userId: sub._id },
                        });
                    });
                    activity.push({
                        userId: sub._id,
                        subtitle: title,
                        title: submission && gradeWeight && gradeWeight > 0 ? ' Grades available' : 'Scores available',
                        status: 'unread',
                        date: new Date(),
                        channelId,
                        cueId,
                    });
                });

                let chunks = notificationService.chunkPushNotifications(messages);
                for (let chunk of chunks) {
                    try {
                        let ticketChunk = await notificationService.sendPushNotificationsAsync(chunk);
                    } catch (e) {
                        console.error(e);
                    }
                }

                // Web notifications

                const oneSignalClient = new OneSignal.Client(
                    '78cd253e-262d-4517-a710-8719abf3ee55',
                    'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
                );

                const notification = {
                    contents: {
                        en:
                            fetchChannel.name +
                            ' - ' +
                            title +
                            ' ' +
                            (submission && gradeWeight && gradeWeight > 0 ? ' Grades available' : 'Scores available'),
                    },
                    include_external_user_ids: userIds,
                };

                if (userIds.length > 0) {
                    const response = await oneSignalClient.createNotification(notification);
                }
            }

            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean)
    public async shareWithAll(
        @Arg('cueId', (type) => String)
        cueId: string
    ) {
        const c: any = await CueModel.findOne({ _id: cueId });

        if (c) {
            const cue = c.toObject();
            const { submission } = cue;

            const channel: any = await ChannelModel.findById(cue.channelId);

            // Get all subscribers first
            const subscriptions = await SubscriptionModel.find({
                channelId: cue.channelId,
                unsubscribedAt: { $exists: false },
            });

            const userIds: string[] = [];

            subscriptions.map((s) => {
                userIds.push(s.userId);
            });

            // Extra step to prevent duplication in case there are multiple subs created by mistake
            const allUsers = await UserModel.find({ _id: { $in: userIds } });

            const mods: any[] = [];
            const statuses: any[] = [];
            const alertUsers: any[] = [];

            // Check if modification already exist and turn restrictAccess off
            for (const user of allUsers) {
                const existingModification = await ModificationsModel.findOne({
                    cueId: cue._id,
                    userId: user._id,
                });

                const clone = Object.assign({}, cue);

                clone.cueId = clone._id;
                delete clone._id;
                delete clone.limitedShares;
                clone.userId = user._id;
                clone.cue = '';
                clone.score = 0;
                clone.graded = false;
                delete clone.__v;
                delete clone.__typename;

                if (existingModification && existingModification._id) {
                    // update restrictAccess
                    await ModificationsModel.updateOne(
                        {
                            cueId: cue._id,
                            userId: user._id,
                        },
                        {
                            restrictAccess: false,
                        }
                    );
                } else {
                    mods.push(clone);

                    statuses.push({
                        userId: user._id,
                        channelId: clone.channelId,
                        status: 'delivered',
                        cueId: clone.cueId,
                    });

                    alertUsers.push(user._id);
                }
            }

            await ModificationsModel.insertMany(mods);
            // create status here
            await StatusModel.insertMany(statuses);

            const added = await UserModel.find({ _id: { $in: alertUsers } });

            added.map(async (user: any) => {
                const messages: any[] = [];
                const notificationService = new Expo();

                const notificationIds = user.notificationId.split('-BREAK-');

                const { title, subtitle: body } = htmlStringParser(cue.cue);

                if (submission) {
                    const activity: any = {
                        userId: user._id,
                        subtitle: title,
                        title: 'New Assignment created',
                        body,
                        status: 'unread',
                        date: new Date(),
                        channelId: cue.channelId,
                        cueId: cueId,
                        target: 'CUE',
                    };

                    ActivityModel.create(activity);
                }

                notificationIds.map((notifId: any) => {
                    if (!Expo.isExpoPushToken(user.notificationId)) {
                        return;
                    }

                    messages.push({
                        to: user.notificationId,
                        sound: 'default',
                        subtitle: title,
                        title: channel.name + (submission ? ' - New Assignment created' : ' - New Content'),
                        data: { userId: user._id },
                    });
                });

                // Web notifications

                const oneSignalClient = new OneSignal.Client(
                    '78cd253e-262d-4517-a710-8719abf3ee55',
                    'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
                );

                const notification = {
                    contents: {
                        en: `${channel.name}` + (submission ? ' - New Assignment created ' : ' - New Content ') + title,
                    },
                    include_external_user_ids: [user._id],
                };

                const response = await oneSignalClient.createNotification(notification);

                let chunks = notificationService.chunkPushNotifications(messages);
                for (let chunk of chunks) {
                    try {
                        await notificationService.sendPushNotificationsAsync(chunk);
                    } catch (e) {
                        console.error(e);
                    }
                }
            });

            return true;
        }

        return false;
    }

    @Field((type) => Boolean)
    public async unshareCueWithIds(
        @Arg('userIds', (type) => [String])
        userIds: string[],
        @Arg('cueId', (type) => String)
        cueId: string
    ) {
        const c: any = await CueModel.findOne({ _id: cueId });

        if (c) {
            const cue = c.toObject();
            const res = await ModificationsModel.updateMany(
                {
                    userId: { $in: userIds },
                    cueId: cue._id,
                },
                {
                    restrictAccess: true,
                }
            );

            console.log('Res', res);

            return true;
        }

        return false;
    }

    @Field((type) => Boolean)
    public async shareCueWithMoreIds(
        @Arg('userIds', (type) => [String])
        userIds: string[],
        @Arg('cueId', (type) => String)
        cueId: string
    ) {
        try {
            const c: any = await CueModel.findOne({ _id: cueId });
            if (c) {
                const mods: any[] = [];
                const statuses: any[] = [];
                const alertUsers: any[] = [];

                const cue = c.toObject();

                const { submission } = cue;

                const channel: any = await ChannelModel.findById(cue.channelId);

                // userIds.map(async (userId: string) => {

                for (const userId of userIds) {
                    const clone = Object.assign({}, cue);

                    clone.cueId = clone._id;
                    delete clone._id;
                    delete clone.limitedShares;
                    clone.userId = userId;
                    clone.cue = '';
                    clone.score = 0;
                    clone.graded = false;
                    delete clone.__v;
                    delete clone.__typename;

                    // Check if modification already exist or else push a new modification
                    const existingModification = await ModificationsModel.findOne({
                        cueId: cue._id,
                        userId,
                    });

                    if (existingModification && existingModification._id) {
                        await ModificationsModel.updateOne(
                            {
                                cueId: cue._id,
                                userId,
                            },
                            {
                                restrictAccess: false,
                            }
                        );
                    } else {
                        mods.push(clone);

                        statuses.push({
                            userId,
                            channelId: clone.channelId,
                            status: 'delivered',
                            cueId: clone.cueId,
                        });

                        alertUsers.push(userId);
                    }
                }

                await ModificationsModel.insertMany(mods);
                // create status here
                await StatusModel.insertMany(statuses);

                const added = await UserModel.find({ _id: { $in: alertUsers } });

                added.map(async (user: any) => {
                    const messages: any[] = [];
                    const notificationService = new Expo();

                    const notificationIds = user.notificationId.split('-BREAK-');

                    const { title, subtitle: body } = htmlStringParser(cue.cue);

                    if (submission) {
                        const activity: any = {
                            userId: user._id,
                            subtitle: title,
                            title: 'New Assignment created',
                            body,
                            status: 'unread',
                            date: new Date(),
                            channelId: cue.channelId,
                            cueId: cueId,
                            target: 'CUE',
                        };

                        ActivityModel.create(activity);
                    }

                    notificationIds.map((notifId: any) => {
                        if (!Expo.isExpoPushToken(user.notificationId)) {
                            return;
                        }

                        messages.push({
                            to: user.notificationId,
                            sound: 'default',
                            subtitle: title,
                            title: channel.name + (submission ? ' - New Assignment created' : ' - New Content'),
                            data: { userId: user._id },
                        });
                    });

                    // Web notifications

                    const oneSignalClient = new OneSignal.Client(
                        '78cd253e-262d-4517-a710-8719abf3ee55',
                        'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
                    );

                    const notification = {
                        contents: {
                            en:
                                `${channel.name}` +
                                (submission ? ' - New Assignment created ' : ' - New Content ') +
                                title,
                        },
                        include_external_user_ids: [user._id],
                    };

                    const response = await oneSignalClient.createNotification(notification);

                    let chunks = notificationService.chunkPushNotifications(messages);
                    for (let chunk of chunks) {
                        try {
                            await notificationService.sendPushNotificationsAsync(chunk);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                });

                return true;
            }
            return false;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => String)
    public async duplicateQuiz(
        @Arg('quizId', (type) => String)
        quizId: string
    ) {
        try {
            const fetchQuiz = await QuizModel.findById(quizId);

            if (!fetchQuiz || fetchQuiz._id === '') {
                return '';
            }

            // Santize answers
            const previousProblems = fetchQuiz.problems;

            const updatedProblems = previousProblems.map((problem: any) => {
                let updatedAnswers = [];

                // Sanitize problems to remove regrade stuff
                if (problem.questionType === '' || problem.questionType === 'trueFalse') {
                    updatedAnswers = problem.options.map((option: any) => {
                        return {
                            isCorrect: option.isCorrect,
                            option: option.option,
                        };
                    });
                }

                console.log('Problem', problem);

                return {
                    question: problem.question,
                    questionType: problem.questionType,
                    points: problem.points,
                    required: problem.required,
                    dragDropData: problem.dragDropData,
                    dragDropHeaders: problem.dragDropHeaders,
                    hotspots: problem.hotspots,
                    hotspotOptions: problem.hotspotOptions,
                    imgUrl: problem.imgUrl,
                    highlightTextHtml: problem.highlightTextHtml,
                    highlightTextChoices: problem.highlightTextChoices,
                    inlineChoiceHtml: problem.inlineChoiceHtml,
                    inlineChoiceOptions: problem.inlineChoiceOptions,
                    textEntryHtml: problem.textEntryHtml,
                    textEntryOptions: problem.textEntryOptions,
                    multipartQuestions: problem.multipartQuestions,
                    multipartOptions: problem.multipartOptions,
                    correctEquations: problem.correctEquations,
                    maxCharCount: problem.maxCharCount,
                    matchTableHeaders: problem.matchTableHeaders,
                    matchTableOptions: problem.matchTableOptions,
                    matchTableChoices: problem.matchTableChoices,
                    // Options was updated manually
                    options: updatedAnswers,
                };
            });

            const duplicate = await QuizModel.create({
                problems: updatedProblems,
                duration: fetchQuiz.duration,
                shuffleQuiz: fetchQuiz.shuffleQuiz,
                instructions: fetchQuiz.instructions,
                headers: fetchQuiz.headers,
            });

            if (duplicate && duplicate._id) {
                return duplicate._id.toString();
            } else {
                return '';
            }
        } catch (e) {
            console.log('Error', e);
            return '';
        }
    }
}
