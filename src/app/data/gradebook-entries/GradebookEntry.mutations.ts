import { Arg, Field, ObjectType } from 'type-graphql';
import { CueModel } from '../cue/mongo/Cue.model';
import { GradebookScoreModel } from '../gradebook-scores/mongo/GradebookScore.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { QuizModel } from '../quiz/mongo/Quiz.model';
import { UserModel } from '../user/mongo/User.model';
import { NewGradebookEntryInput } from './input-types/NewGradebookEntryInput.type';
import { GradebookEntryModel } from './mongo/GradebookEntry.model';
import { Expo } from 'expo-server-sdk';
import { htmlStringParser } from '@helper/HTMLParser';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import * as OneSignal from 'onesignal-node';

@ObjectType()
export class GradebookEntryMutationResolver {
    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async create(
        @Arg('gradebookEntryInput', (type) => NewGradebookEntryInput) gradebookEntryInput: NewGradebookEntryInput
    ) {
        try {
            const { title, totalPoints, gradeWeight, deadline, channelId, scores } = gradebookEntryInput;

            // First create entry
            const createGradebook = await GradebookEntryModel.create({
                title,
                totalPoints,
                gradeWeight,
                deadline,
                channelId,
            });

            if (!createGradebook) {
                return false;
            }

            const entries = scores.map((score: any) => {
                let calculateScore = undefined;

                if (score.points) {
                    calculateScore = (score.points / totalPoints) * 100;

                    calculateScore = Math.round((calculateScore + Number.EPSILON) * 100) / 100;
                }

                return {
                    gradebookEntryId: createGradebook._id,
                    channelId,
                    userId: score.userId,
                    submitted: score.submitted,
                    points: score.points,
                    lateSubmission: score.lateSubmission,
                    submittedAt: score.submittedAt,
                    feedback: score.feedback,
                    score: calculateScore,
                };
            });

            const insertScores = await GradebookScoreModel.insertMany(entries);

            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async edit(
        @Arg('gradebookEntryInput', (type) => NewGradebookEntryInput) gradebookEntryInput: NewGradebookEntryInput,
        @Arg('entryId', (type) => String) entryId: string
    ) {
        try {
            const { title, totalPoints, gradeWeight, deadline, channelId, scores } = gradebookEntryInput;

            // First update the entry
            const updateGradebookEntry = await GradebookEntryModel.updateOne(
                {
                    _id: entryId,
                },
                {
                    title,
                    totalPoints,
                    gradeWeight,
                    deadline,
                }
            );

            const getAllGradebookScores = await GradebookScoreModel.find({
                gradebookEntryId: entryId,
            });

            for (let i = 0; i < getAllGradebookScores.length; i++) {
                const gradebookScore = getAllGradebookScores[i];

                const findScore = scores.find((x: any) => x.userId === gradebookScore.userId);

                if (findScore) {
                    // Update existing score

                    let calculateScore = undefined;

                    if (findScore.points) {
                        calculateScore = (findScore.points / totalPoints) * 100;

                        calculateScore = Math.round((calculateScore + Number.EPSILON) * 100) / 100;
                    }

                    const updateGradebookScore = await GradebookScoreModel.updateOne(
                        {
                            _id: gradebookScore._id,
                        },
                        {
                            submitted: findScore.submitted,
                            points: findScore.points,
                            score: calculateScore,
                            lateSubmission: findScore.lateSubmission,
                            submittedAt: findScore.submittedAt,
                            feedback: findScore.feedback,
                        }
                    );
                } else {
                    // Remove the score from database
                    const deleteGradebookScore = await GradebookScoreModel.deleteOne({
                        _id: gradebookScore._id,
                    });
                }
            }

            let newScores: any[] = [];

            for (let i = 0; i < scores.length; i++) {
                const score = scores[i];

                let calculateScore = undefined;

                if (score.points) {
                    calculateScore = (score.points / totalPoints) * 100;

                    calculateScore = Math.round((calculateScore + Number.EPSILON) * 100) / 100;
                }

                const findExistingScore = getAllGradebookScores.find((x: any) => x.userId === score.userId);

                if (!findExistingScore) {
                    // Add new entry
                    newScores.push({
                        gradebookEntryId: entryId,
                        channelId,
                        userId: score.userId,
                        submitted: score.submitted,
                        points: score.points,
                        lateSubmission: score.lateSubmission,
                        submittedAt: score.submittedAt,
                        feedback: score.feedback,
                        score: calculateScore,
                    });
                }
            }

            if (newScores.length > 0) {
                const insertScores = await GradebookScoreModel.insertMany(newScores);
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async delete(@Arg('entryId', (type) => String) entryId: string) {
        try {
            // Delete entry first
            const deleteEntry = await GradebookEntryModel.deleteOne({
                _id: entryId,
            });

            // Delete all the scores later
            const deleteScores = await GradebookScoreModel.deleteMany({
                gradebookEntryId: entryId,
            });

            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used to update score directly from the gradebook.',
    })
    public async handleUpdateGradebookScore(
        @Arg('userId', (type) => String) userId: string,
        @Arg('entryId', (type) => String) entryId: string,
        @Arg('gradebookEntry', (type) => Boolean) gradebookEntry: boolean,
        @Arg('score', (type) => Number) score: number
    ) {
        try {
            function isJsonString(str: string) {
                try {
                    JSON.parse(str);
                } catch (e) {
                    return false;
                }
                return true;
            }

            if (gradebookEntry) {
                // Fetch Gradebook entry to get total score
                const gradebookEntry = await GradebookEntryModel.findOne({
                    _id: entryId,
                });

                if (!gradebookEntry) return false;

                let calculateScore = (score / gradebookEntry.totalPoints) * 100;

                calculateScore = Math.round((calculateScore + Number.EPSILON) * 100) / 100;

                // Check if existing score model
                const existingUserScore = await GradebookScoreModel.findOne({
                    gradebookEntryId: entryId,
                    userId,
                });

                // Update current score
                if (existingUserScore) {
                    const updateUserScore = await GradebookScoreModel.updateOne(
                        {
                            gradebookEntryId: entryId,
                            userId,
                        },
                        {
                            points: score,
                            score: calculateScore,
                            submitted: true,
                        }
                    );

                    if (updateUserScore.nModified > 0) return true;
                } else {
                    // Create a new score
                    const createNewScore = await GradebookScoreModel.create({
                        gradebookEntryId: entryId,
                        userId,
                        points: score,
                        score: calculateScore,
                        submitted: true,
                    });

                    if (createNewScore) return true;
                }
            } else {
                const fetchCue = await CueModel.findOne({
                    _id: entryId,
                });

                if (!fetchCue) return false;

                const cue = fetchCue.toObject();

                let total;

                // Calculate total points depending on whether it is Assignment or quiz
                if (isJsonString(cue.cue)) {
                    const parseObj = JSON.parse(cue.cue);

                    if (parseObj.quizId && parseObj.quizId) {
                        // Quiz so need to calculate the total points for the assignments
                        const fetchQuiz = await QuizModel.findById(parseObj.quizId);

                        if (fetchQuiz) {
                            let totalPoints = 0;

                            fetchQuiz.problems.map((problem: any) => {
                                totalPoints += problem.points;
                            });

                            total = totalPoints;
                        } else {
                            return false;
                        }
                    } else {
                        // Regular submission so push values into gradedAssignments
                        total = cue.totalPoints ? cue.totalPoints : 100;
                    }
                } else {
                    total = cue.totalPoints ? cue.totalPoints : 100;
                }

                let calculateScore = (score / total) * 100;

                calculateScore = Math.round((calculateScore + Number.EPSILON) * 100) / 100;

                // Update modification
                const updateScore = await ModificationsModel.updateOne(
                    {
                        cueId: entryId,
                        userId,
                    },
                    {
                        pointsScored: score,
                        score: calculateScore,
                    }
                );

                if (updateScore.nModified > 0) return true;
            }

            return false;
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used to update score directly from the gradebook.',
    })
    public async handleReleaseSubmission(
        @Arg('entryId', (type) => String) entryId: string,
        @Arg('gradebookEntry', (type) => Boolean) gradebookEntry: boolean,
        @Arg('releaseSubmission', (type) => Boolean) releaseSubmission: boolean
    ) {
        // Gradebook entry
        try {
            if (gradebookEntry) {
                // Update gradebook entry
                const updateGradebook = await GradebookEntryModel.updateOne(
                    {
                        _id: entryId,
                    },
                    {
                        releaseSubmission,
                    }
                );

                const fetchGradebookEntry = await GradebookEntryModel.findOne({
                    _id: entryId,
                });

                if (updateGradebook.nModified > 0 && releaseSubmission && fetchGradebookEntry) {
                    const { title, channelId } = fetchGradebookEntry;

                    const notificationService = new Expo();
                    let userIds: string[] = [];
                    const messages: any[] = [];

                    const fetchChannel = await ChannelModel.findById(channelId);

                    if (!fetchChannel) return;

                    const subscriptions = await SubscriptionModel.find({
                        $and: [{ channelId }, { unsubscribedAt: { $exists: false } }],
                    });

                    subscriptions.map((s) => {
                        userIds.push(s.userId);
                    });

                    const subscribers = await UserModel.find({ _id: { $in: userIds } });

                    subscribers.map((sub: any) => {
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
                                body: 'Grades available',
                                data: { userId: sub._id },
                            });
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
                            en: fetchChannel.name + ' - ' + title + ' ' + 'Grades available',
                        },
                        include_external_user_ids: userIds,
                    };

                    if (userIds.length > 0) {
                        const response = await oneSignalClient.createNotification(notification);
                    }

                    return true;
                } else if (updateGradebook.nModified > 0) {
                    return true;
                }

                // Assignment
            } else {
                const updateCue = await CueModel.updateOne(
                    {
                        _id: entryId,
                    },
                    {
                        releaseSubmission,
                    }
                );

                console.log('Update Cue', updateCue);

                const updateModifications = await ModificationsModel.updateMany(
                    {
                        cueId: entryId,
                    },
                    {
                        releaseSubmission,
                    }
                );

                const fetchCue = await CueModel.findById(entryId);

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
                                    submission && gradeWeight && gradeWeight > 0
                                        ? ' Grades available'
                                        : 'Scores available',
                                data: { userId: sub._id },
                            });
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
                                (submission && gradeWeight && gradeWeight > 0
                                    ? ' Grades available'
                                    : 'Scores available'),
                        },
                        include_external_user_ids: userIds,
                    };

                    if (userIds.length > 0) {
                        const response = await oneSignalClient.createNotification(notification);
                    }

                    return true;
                } else if (updateCue.nModified > 0) {
                    return true;
                }
            }

            return false;
        } catch (e) {
            return false;
        }
    }
}
