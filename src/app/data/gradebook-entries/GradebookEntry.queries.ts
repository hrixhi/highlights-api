import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { GradebookScoreModel } from '../gradebook-scores/mongo/GradebookScore.model';
import { GradingScaleModel } from '../grading-scale/mongo/gradingScale.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { QuizModel } from '../quiz/mongo/Quiz.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { UserModel } from '../user/mongo/User.model';
import { GradebookEntryModel } from './mongo/GradebookEntry.model';
import { GradebookObject } from './types/GradebookObject.type';
import * as ss from 'simple-statistics';
import { GradebookAssignmentStatsObject } from './types/GradebookAssignmentStats.type';
import { GradebookUserStatsObject } from './types/GradebookUserStats.type';

/**
 * Channel Query Endpoints
 */
@ObjectType()
export class GradebookQueryResolver {
    // Return details of all the
    @Field((type) => GradebookObject, {
        description: 'Returns list of channels created by a user.',
        nullable: true,
    })
    public async getGradebook(
        @Arg('channelId', (type) => String)
        channelId: string
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

            const htmlStringParser = (htmlString: string) => {
                if (htmlString === null || !htmlString) {
                    return {
                        title: 'NO_CONTENT',
                        subtitle: '',
                    };
                }

                const parsedString = htmlString
                    .replace(/<[^>]+>/g, '\n')
                    .split('&nbsp;')
                    .join(' ')
                    .replace('&amp;', '&');
                const lines = parsedString.split('\n');
                const filteredLines = lines.filter((i) => {
                    return i.toString().trim() !== '';
                });
                let title = '';
                if (filteredLines.length > 0) {
                    if (filteredLines[0][0] === '{' && filteredLines[0][filteredLines[0].length - 1] === '}') {
                        const obj = JSON.parse(filteredLines[0]);
                        title = obj.title ? obj.title : 'file';
                    } else {
                        title = filteredLines.length > 0 ? filteredLines[0] : 'NO_CONTENT';
                    }
                } else {
                    title = 'NO_CONTENT';
                }
                return {
                    title,
                    subtitle: filteredLines.length > 1 ? filteredLines[1] : '',
                };
            };

            const fetchChannel = await ChannelModel.findById(channelId);

            if (!fetchChannel) return null;

            let owners: any[] = [];

            owners = fetchChannel.owners
                ? [...fetchChannel.owners, fetchChannel.createdBy.toString()]
                : [fetchChannel.createdBy.toString()];

            const activeSubscribers = await SubscriptionModel.find({
                channelId,
                unsubscribedAt: undefined,
            });

            const studentIds: string[] = [];

            activeSubscribers.map((sub: any) => {
                if (!owners.includes(sub.userId.toString())) {
                    studentIds.push(sub.userId.toString());
                }
            });

            // Store title, deadline, weightage, cueId or gradeEntryId
            const gradedAssignments: any[] = [];

            // Compile a list of Cues + Entries in the Gradebook
            const channelCues = await CueModel.find({
                channelId,
                submission: true,
            });

            if (!channelCues) {
                return null;
            }

            for (let i = 0; i < channelCues.length; i++) {
                const cue = channelCues[i].toObject();

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

                            gradedAssignments.push({
                                title: htmlStringParser(cue.cue).title,
                                deadline: cue.deadline,
                                gradeWeight: cue.gradeWeight ? cue.gradeWeight : 0,
                                totalPoints,
                                cueId: cue._id,
                                gradebookEntryId: undefined,
                                releaseSubmission: cue.releaseSubmission,
                            });
                        }
                    } else {
                        // Regular submission so push values into gradedAssignments

                        gradedAssignments.push({
                            title: htmlStringParser(cue.cue).title,
                            deadline: cue.deadline,
                            gradeWeight: cue.gradeWeight ? cue.gradeWeight : 0,
                            totalPoints: cue.totalPoints ? cue.totalPoints : 100,
                            cueId: cue._id,
                            gradebookEntryId: undefined,
                            releaseSubmission: cue.releaseSubmission,
                        });
                    }
                }
            }

            // Get entries from the Gradebook
            const gradebookEntries = await GradebookEntryModel.find({
                channelId,
            });

            for (let i = 0; i < gradebookEntries.length; i++) {
                const entry = gradebookEntries[i].toObject();

                gradedAssignments.push({
                    title: entry.title,
                    deadline: entry.deadline,
                    gradeWeight: entry.gradeWeight,
                    totalPoints: entry.totalPoints,
                    cueId: undefined,
                    gradebookEntryId: entry._id,
                    releaseSubmission: false,
                });
            }

            const assignmentsWithScores: any[] = [];

            const studentTotalsMap: any = {};

            // Construct scores
            for (let i = 0; i < gradedAssignments.length; i++) {
                const assignment = gradedAssignments[i];

                if (assignment.cueId) {
                    // Fetch all modifications
                    const fetchModifications = await ModificationsModel.find({
                        cueId: assignment.cueId,
                        userId: { $in: studentIds },
                    });

                    let scores: any = [];

                    for (let i = 0; i < fetchModifications.length; i++) {
                        const mod = fetchModifications[i].toObject();

                        // Add the scores to the scores one
                        scores.push({
                            userId: mod.userId,
                            pointsScored: mod.pointsScored ? mod.pointsScored : undefined,
                            score: mod.score ? mod.score : undefined,
                            lateSubmission: mod.submittedAt ? mod.submittedAt > assignment.deadline : undefined,
                            submittedAt: mod.submittedAt,
                            submitted: mod.submittedAt ? true : false,
                        });

                        // Add the current score for student to student
                        if (studentTotalsMap[mod.userId]) {
                            studentTotalsMap[mod.userId].push({
                                gradeWeight: assignment.gradeWeight,
                                pointsScored: mod.pointsScored ? mod.pointsScored : undefined,
                                totalPoints: assignment.totalPoints,
                                score: mod.score ? mod.score : 0,
                            });
                        } else {
                            studentTotalsMap[mod.userId] = [
                                {
                                    gradeWeight: assignment.gradeWeight,
                                    pointsScored: mod.pointsScored ? mod.pointsScored : undefined,
                                    totalPoints: assignment.totalPoints,
                                    score: mod.score ? mod.score : 0,
                                },
                            ];
                        }
                    }

                    assignmentsWithScores.push({
                        ...assignment,
                        scores,
                    });
                } else {
                    const fetchGradebookScores = await GradebookScoreModel.find({
                        gradebookEntryId: assignment.gradebookEntryId,
                        userId: { $in: studentIds },
                    });

                    let scores: any = [];

                    for (let i = 0; i < fetchGradebookScores.length; i++) {
                        const mod = fetchGradebookScores[i].toObject();

                        // Add the scores to the scores one
                        scores.push({
                            userId: mod.userId,
                            pointsScored: mod.points ? mod.points : undefined,
                            score: mod.score ? mod.score : undefined,
                            lateSubmission: mod.lateSubmission
                                ? mod.lateSubmission
                                : mod.submittedAt
                                ? mod.submittedAt > assignment.deadline
                                : undefined,
                            submittedAt: mod.submittedAt,
                            submitted: mod.submitted,
                        });

                        // Add the current score for student to student
                        if (studentTotalsMap[mod.userId]) {
                            studentTotalsMap[mod.userId].push({
                                gradeWeight: assignment.gradeWeight,
                                pointsScored: mod.points ? mod.points : undefined,
                                totalPoints: assignment.totalPoints,
                                score: mod.score ? mod.score : 0,
                            });
                        } else {
                            studentTotalsMap[mod.userId] = [
                                {
                                    gradeWeight: assignment.gradeWeight,
                                    pointsScored: mod.points ? mod.points : undefined,
                                    totalPoints: assignment.totalPoints,
                                    score: mod.score ? mod.score : 0,
                                },
                            ];
                        }
                    }
                    assignmentsWithScores.push({
                        ...assignment,
                        scores,
                    });
                }
            }

            // Calculate totals for each user
            let totals: any[] = [];

            for (let i = 0; i < Object.keys(studentTotalsMap).length; i++) {
                const userId = Object.keys(studentTotalsMap)[i];

                let individualScores = studentTotalsMap[userId];

                let weightGradeTotal = 0;

                // Map

                let totalPointsPossible = 0;

                let pointsScored = 0;

                let score = 0;

                for (let j = 0; j < individualScores.length; j++) {
                    const x = individualScores[j];
                    totalPointsPossible += x.totalPoints;
                    if (x.pointsScored) {
                        pointsScored += x.pointsScored;
                    }
                    weightGradeTotal += x.gradeWeight;
                    score += x.score * (x.gradeWeight / 100);
                }

                // Scale total score if weightage is less than 100

                if (weightGradeTotal < 100) {
                    score = (score * 100) / weightGradeTotal;
                }

                totals.push({
                    userId,
                    pointsScored,
                    totalPointsPossible,
                    score: Math.round((score + Number.EPSILON) * 100) / 100,
                });
            }

            console.log('Totals', totals);

            const fetchUsers = await UserModel.find({
                _id: { $in: studentIds },
            });

            const users: any[] = [];

            fetchUsers.map((user) => {
                users.push({
                    userId: user._id,
                    fullName: user.fullName,
                    avatar: user.avatar,
                });
            });

            // Sort the assignments by Deadline
            assignmentsWithScores.sort((a: any, b: any) => {
                return a.deadline < b.deadline ? 1 : -1;
            });

            return {
                entries: assignmentsWithScores,
                totals,
                users,
            };
        } catch (e) {
            console.log('error', e);
            return null;
        }
    }

    @Field((type) => [GradebookAssignmentStatsObject], {
        description: 'Returns list of channels created by a user.',
        nullable: true,
    })
    public async getAssignmentAnalytics(
        @Arg('channelId', (type) => String)
        channelId: string
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

            const htmlStringParser = (htmlString: string) => {
                if (htmlString === null || !htmlString) {
                    return {
                        title: 'NO_CONTENT',
                        subtitle: '',
                    };
                }

                const parsedString = htmlString
                    .replace(/<[^>]+>/g, '\n')
                    .split('&nbsp;')
                    .join(' ')
                    .replace('&amp;', '&');
                const lines = parsedString.split('\n');
                const filteredLines = lines.filter((i) => {
                    return i.toString().trim() !== '';
                });
                let title = '';
                if (filteredLines.length > 0) {
                    if (filteredLines[0][0] === '{' && filteredLines[0][filteredLines[0].length - 1] === '}') {
                        const obj = JSON.parse(filteredLines[0]);
                        title = obj.title ? obj.title : 'file';
                    } else {
                        title = filteredLines.length > 0 ? filteredLines[0] : 'NO_CONTENT';
                    }
                } else {
                    title = 'NO_CONTENT';
                }
                return {
                    title,
                    subtitle: filteredLines.length > 1 ? filteredLines[1] : '',
                };
            };

            const fetchChannel = await ChannelModel.findById(channelId);

            if (!fetchChannel) return null;

            let owners: any[] = [];

            owners = fetchChannel.owners
                ? [...fetchChannel.owners, fetchChannel.createdBy.toString()]
                : [fetchChannel.createdBy.toString()];

            const activeSubscribers = await SubscriptionModel.find({
                channelId,
                unsubscribedAt: undefined,
            });

            const studentIds: string[] = [];

            activeSubscribers.map((sub: any) => {
                if (!owners.includes(sub.userId.toString())) {
                    studentIds.push(sub.userId.toString());
                }
            });

            // Store title, deadline, weightage, cueId or gradeEntryId
            const gradedAssignments: any[] = [];

            // Compile a list of Cues + Entries in the Gradebook
            const channelCues = await CueModel.find({
                channelId,
                submission: true,
            });

            if (!channelCues) {
                return null;
            }

            for (let i = 0; i < channelCues.length; i++) {
                const cue = channelCues[i].toObject();

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

                            gradedAssignments.push({
                                title: htmlStringParser(cue.cue).title,
                                totalPoints,
                                cueId: cue._id,
                                gradebookEntryId: undefined,
                                deadline: cue.deadline,
                            });
                        }
                    } else {
                        // Regular submission so push values into gradedAssignments

                        gradedAssignments.push({
                            title: htmlStringParser(cue.cue).title,
                            totalPoints: cue.totalPoints ? cue.totalPoints : 100,
                            cueId: cue._id,
                            gradebookEntryId: undefined,
                            deadline: cue.deadline,
                        });
                    }
                }
            }

            // Get entries from the Gradebook
            const gradebookEntries = await GradebookEntryModel.find({
                channelId,
            });

            for (let i = 0; i < gradebookEntries.length; i++) {
                const entry = gradebookEntries[i].toObject();

                gradedAssignments.push({
                    title: entry.title,
                    totalPoints: entry.totalPoints,
                    cueId: undefined,
                    gradebookEntryId: entry._id,
                    deadline: entry.deadline,
                });
            }

            const assignmentScoresMap: any = {};
            const assignmentPointsMap: any = {};
            const statusMap: any = {};
            const topPerformersMap: any = {};
            const bottomPerformersMap: any = {};

            // Construct scores
            for (let i = 0; i < gradedAssignments.length; i++) {
                const assignment = gradedAssignments[i];

                if (assignment.cueId) {
                    // Fetch all modifications
                    const fetchModifications = await ModificationsModel.find({
                        cueId: assignment.cueId,
                        userId: { $in: studentIds },
                    });

                    let sharedWith = fetchModifications.length;
                    let submitted = 0;
                    let graded = 0;

                    let userScores = [];

                    for (let i = 0; i < fetchModifications.length; i++) {
                        const mod = fetchModifications[i].toObject();

                        // Add the current score for student to student

                        if (mod.score && mod.graded) {
                            if (assignmentScoresMap[assignment.cueId]) {
                                assignmentScoresMap[assignment.cueId].push(mod.score);
                            } else {
                                assignmentScoresMap[assignment.cueId] = [mod.score];
                            }

                            userScores.push({
                                userId: mod.userId,
                                score: mod.score,
                                pointsScored: mod.pointsScored,
                            });
                        }

                        if (mod.pointsScored && mod.graded) {
                            if (assignmentPointsMap[assignment.cueId]) {
                                assignmentPointsMap[assignment.cueId].push(mod.pointsScored);
                            } else {
                                assignmentPointsMap[assignment.cueId] = [mod.pointsScored];
                            }
                        }

                        if (mod.submittedAt && mod.graded) {
                            graded += 1;
                        } else if (mod.submittedAt) {
                            submitted += 1;
                        }
                    }

                    userScores.sort((a: any, b: any) => {
                        return a.score > b.score ? 1 : -1;
                    });

                    let topN = 5;

                    if (userScores.length < 10) {
                        topN = Math.floor(userScores.length / 2);
                    }

                    const topPerformers = [];
                    const bottomPerformers = [];

                    for (let i = 0; i < topN; i++) {
                        const x = userScores[i];

                        const fetchUser = await UserModel.findById(x.userId);

                        topPerformers.push({
                            score: x.score,
                            pointsScored: x.pointsScored ? x.pointsScored : 0,
                            userId: x.userId,
                            fullName: fetchUser?.fullName,
                            avatar: fetchUser?.avatar,
                        });
                    }

                    for (let i = userScores.length - 1; i > userScores.length - 1 - topN; i--) {
                        const x = userScores[i];

                        const fetchUser = await UserModel.findById(x.userId);

                        bottomPerformers.push({
                            score: x.score,
                            pointsScored: x.pointsScored ? x.pointsScored : 0,
                            userId: x.userId,
                            fullName: fetchUser?.fullName,
                            avatar: fetchUser?.avatar,
                        });
                    }

                    statusMap[assignment.cueId] = {
                        sharedWith,
                        submitted,
                        graded,
                    };

                    topPerformersMap[assignment.cueId] = topPerformers;
                    bottomPerformersMap[assignment.cueId] = bottomPerformers;
                } else {
                    const fetchGradebookScores = await GradebookScoreModel.find({
                        gradebookEntryId: assignment.gradebookEntryId,
                        userId: { $in: studentIds },
                    });

                    let sharedWith = fetchGradebookScores.length;
                    let submitted = 0;
                    let graded = 0;

                    let userScores = [];

                    for (let i = 0; i < fetchGradebookScores.length; i++) {
                        const mod = fetchGradebookScores[i].toObject();
                        if (mod.score) {
                            if (assignmentScoresMap[assignment.gradebookEntryId]) {
                                assignmentScoresMap[assignment.gradebookEntryId].push(mod.score);
                            } else {
                                assignmentScoresMap[assignment.gradebookEntryId] = [mod.score];
                            }

                            if (assignmentPointsMap[assignment.gradebookEntryId]) {
                                assignmentPointsMap[assignment.gradebookEntryId].push(mod.points);
                            } else {
                                assignmentPointsMap[assignment.gradebookEntryId] = [mod.points];
                            }

                            userScores.push({
                                userId: mod.userId,
                                score: mod.score,
                                pointsScored: mod.points,
                            });
                        }

                        if (mod.submitted && mod.score) {
                            graded += 1;
                        } else if (mod.submitted) {
                            graded += 1;
                        }
                    }

                    userScores.sort((a: any, b: any) => {
                        return a.score > b.score ? 1 : -1;
                    });

                    let topN = 5;

                    if (userScores.length < 10) {
                        topN = Math.floor(userScores.length / 2);
                    }

                    const topPerformers = [];
                    const bottomPerformers = [];

                    console.log('Top N', topN);

                    for (let i = 0; i < topN; i++) {
                        const x = userScores[i];

                        const fetchUser = await UserModel.findById(x.userId);

                        topPerformers.push({
                            score: x.score,
                            pointsScored: x.pointsScored ? x.pointsScored : 0,
                            userId: x.userId,
                            fullName: fetchUser?.fullName,
                            avatar: fetchUser?.avatar,
                        });
                    }

                    console.log('Top performers', topPerformers);

                    for (let i = userScores.length - 1; i > userScores.length - 1 - topN; i--) {
                        const x = userScores[i];

                        const fetchUser = await UserModel.findById(x.userId);

                        bottomPerformers.push({
                            score: x.score,
                            pointsScored: x.pointsScored ? x.pointsScored : 0,
                            userId: x.userId,
                            fullName: fetchUser?.fullName,
                            avatar: fetchUser?.avatar,
                        });
                    }

                    console.log('Bottom performers', bottomPerformers);

                    statusMap[assignment.gradebookEntryId] = {
                        sharedWith,
                        submitted,
                        graded,
                    };

                    topPerformersMap[assignment.gradebookEntryId] = topPerformers;
                    bottomPerformersMap[assignment.gradebookEntryId] = bottomPerformers;
                }
            }

            const returnStats = [];

            for (let i = 0; i < gradedAssignments.length; i++) {
                const assignment = gradedAssignments[i];

                const scores = assignmentScoresMap[
                    assignment.cueId ? assignment.cueId : assignment.gradebookEntryId
                ] || [0];

                const pointsScored = assignmentPointsMap[
                    assignment.cueId ? assignment.cueId : assignment.gradebookEntryId
                ] || [0];

                const statuses = statusMap[assignment.cueId ? assignment.cueId : assignment.gradebookEntryId];

                const { sharedWith, submitted, graded } = statuses;

                const top = topPerformersMap[assignment.cueId ? assignment.cueId : assignment.gradebookEntryId];

                const bottom = bottomPerformersMap[assignment.cueId ? assignment.cueId : assignment.gradebookEntryId];

                if (scores && scores.length > 0) {
                    const max = ss.max(scores);
                    const min = ss.min(scores);
                    const mean = ss.mean(scores);
                    const median = ss.median(scores);
                    const std = ss.standardDeviation(scores);

                    const maxPts = ss.max(pointsScored);
                    const minPts = ss.min(pointsScored);
                    const meanPts = ss.mean(pointsScored);
                    const medianPts = ss.median(pointsScored);
                    const stdPts = ss.standardDeviation(pointsScored);

                    returnStats.push({
                        ...assignment,
                        max,
                        min,
                        mean,
                        median,
                        std: Math.round((std + Number.EPSILON) * 100) / 100,
                        maxPts,
                        minPts,
                        meanPts,
                        medianPts,
                        stdPts: Math.round((stdPts + Number.EPSILON) * 100) / 100,
                        sharedWith,
                        submitted,
                        graded,
                        topPerformers: top,
                        bottomPerformers: bottom,
                    });
                } else {
                    returnStats.push({
                        ...assignment,
                        max: 0,
                        min: 0,
                        mean: 0,
                        median: 0,
                        std: 0,
                        maxPts: 0,
                        minPts: 0,
                        meanPts: 0,
                        medianPts: 0,
                        stdPts: 0,
                        sharedWith,
                        submitted,
                        graded,
                        topPerformers: top,
                        bottomPerformers: bottom,
                    });
                }
            }

            return returnStats;
        } catch (e) {
            console.log('error', e);
            return null;
        }
    }

    @Field((type) => GradebookUserStatsObject, {
        description: 'Returns list of channels created by a user.',
        nullable: true,
    })
    public async getStudentScores(
        @Arg('channelId', (type) => String)
        channelId: string,
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            const htmlStringParser = (htmlString: string) => {
                if (htmlString === null || !htmlString) {
                    return {
                        title: 'NO_CONTENT',
                        subtitle: '',
                    };
                }

                const parsedString = htmlString
                    .replace(/<[^>]+>/g, '\n')
                    .split('&nbsp;')
                    .join(' ')
                    .replace('&amp;', '&');
                const lines = parsedString.split('\n');
                const filteredLines = lines.filter((i) => {
                    return i.toString().trim() !== '';
                });
                let title = '';
                if (filteredLines.length > 0) {
                    if (filteredLines[0][0] === '{' && filteredLines[0][filteredLines[0].length - 1] === '}') {
                        const obj = JSON.parse(filteredLines[0]);
                        title = obj.title ? obj.title : 'file';
                    } else {
                        title = filteredLines.length > 0 ? filteredLines[0] : 'NO_CONTENT';
                    }
                } else {
                    title = 'NO_CONTENT';
                }
                return {
                    title,
                    subtitle: filteredLines.length > 1 ? filteredLines[1] : '',
                };
            };

            const fetchChannel = await ChannelModel.findById(channelId);

            if (!fetchChannel) return null;

            let owners: any[] = [];

            owners = fetchChannel.owners
                ? [...fetchChannel.owners, fetchChannel.createdBy.toString()]
                : [fetchChannel.createdBy.toString()];

            const activeSubscribers = await SubscriptionModel.find({
                channelId,
                unsubscribedAt: undefined,
            });

            const studentIds: string[] = [];

            activeSubscribers.map((sub: any) => {
                if (!owners.includes(sub.userId.toString())) {
                    studentIds.push(sub.userId.toString());
                }
            });

            // Store title, deadline, weightage, cueId or gradeEntryId
            const gradedAssignments: any[] = [];

            // Compile a list of Cues + Entries in the Gradebook
            const channelCues = await CueModel.find({
                channelId,
                submission: true,
            });

            if (!channelCues) {
                return null;
            }

            for (let i = 0; i < channelCues.length; i++) {
                const cue = channelCues[i].toObject();

                gradedAssignments.push({
                    title: htmlStringParser(cue.cue).title,
                    cueId: cue._id,
                    gradebookEntryId: undefined,
                    gradeWeight: cue.gradeWeight ? cue.gradeWeight : 0,
                });
            }

            // Get entries from the Gradebook
            const gradebookEntries = await GradebookEntryModel.find({
                channelId,
            });

            for (let i = 0; i < gradebookEntries.length; i++) {
                const entry = gradebookEntries[i].toObject();

                gradedAssignments.push({
                    title: entry.title,
                    cueId: undefined,
                    gradebookEntryId: entry._id,
                    gradeWeight: entry.gradeWeight ? entry.gradeWeight : 0,
                });
            }

            const userScoresList: any = [];

            const allScores: any = [];

            let sharedWith = 0;

            let graded = 0;

            let submitted = 0;

            let totalSharedGradeWeight = 0;

            let completedGradeWeight = 0;

            // Construct scores
            for (let i = 0; i < gradedAssignments.length; i++) {
                const assignment = gradedAssignments[i];

                if (assignment.cueId) {
                    // Fetch all modifications
                    const fetchModification = await ModificationsModel.findOne({
                        cueId: assignment.cueId,
                        userId,
                    });

                    if (fetchModification) {
                        const mod = fetchModification.toObject();

                        sharedWith += 1;

                        totalSharedGradeWeight += assignment.gradeWeight;

                        if (mod.score && mod.graded) {
                            userScoresList.push({
                                cueId: assignment.cueId,
                                score: mod.score,
                                pointsScored: mod.pointsScored ? mod.pointsScored : 0,
                            });

                            allScores.push({
                                gradeWeight: assignment.gradeWeight,
                                score: mod.score,
                            });

                            graded += 1;

                            completedGradeWeight += assignment.gradeWeight;
                        } else if (mod.score) {
                            submitted += 1;
                        }
                    }
                } else {
                    const fetchGradebookScore = await GradebookScoreModel.findOne({
                        gradebookEntryId: assignment.gradebookEntryId,
                        userId,
                    });

                    if (fetchGradebookScore) {
                        const mod = fetchGradebookScore.toObject();

                        sharedWith += 1;

                        totalSharedGradeWeight += assignment.gradeWeight;

                        if (mod.submitted && mod.score) {
                            userScoresList.push({
                                gradebookEntryId: assignment.gradebookEntryId,
                                score: mod.score,
                                pointsScored: mod.points ? mod.points : 0,
                            });

                            allScores.push({
                                gradeWeight: assignment.gradeWeight,
                                score: mod.score,
                            });

                            completedGradeWeight += assignment.gradeWeight;

                            graded += 1;
                        } else if (mod.submitted) {
                            submitted += 1;
                        }
                    }
                }
            }

            let totalScore = 0;
            let weightGradeTotal = 0;

            allScores.map((x: any) => {
                totalScore += x.score * x.gradeWeight;
                weightGradeTotal += x.gradeWeight;
            });

            if (weightGradeTotal < 100) {
                totalScore = (totalScore * 100) / weightGradeTotal;
            }
            const score = Math.round((totalScore + Number.EPSILON) * 100) / 100;

            let progress = (completedGradeWeight / totalSharedGradeWeight) * 100;

            progress = Math.round((progress + Number.EPSILON) * 100) / 100;

            return {
                score,
                progress,
                sharedWith,
                graded,
                submitted,
                scores: userScoresList,
            };
        } catch (e) {
            return null;
        }
    }
}
