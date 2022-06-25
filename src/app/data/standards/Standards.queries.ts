import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { GradingScaleModel } from '../grading-scale/mongo/gradingScale.model';
import { StandardsScoresModel } from '../standards-scores/mongo/standards-scores.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { UserModel } from '../user/mongo/User.model';
import { StandardsModel } from './mongo/Standards.model';
import { StandardsGradebookObject } from './types/StandardsGradebook.type';
import * as ss from 'simple-statistics';
import { StandardsInsightsObject } from './types/StandardsInsights.type';
import { StandardsGradebookStudentObject } from './types/StandardsGradebookStudent.type';

/**
 * Channel Query Endpoints
 */
@ObjectType()
export class StandardsQueryResolver {
    @Field((type) => StandardsGradebookObject, {
        description: 'Returns list of channels created by a user.',
        nullable: true,
    })
    public async getStandardsGradebook(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            // Fetch all course students after that
            const fetchChannel = await ChannelModel.findById(channelId);

            if (!fetchChannel) return null;

            let owners: any[] = [];

            if (fetchChannel) {
                owners = fetchChannel.owners
                    ? [...fetchChannel.owners, fetchChannel.createdBy.toString()]
                    : [fetchChannel.createdBy.toString()];
            }

            const subscribers = await SubscriptionModel.find({
                channelId,
                unsubscribedAt: { $exists: false },
            });

            const userIds: string[] = [];

            subscribers.map((sub: any) => {
                const subscriber = sub.toObject();

                if (!owners.includes(subscriber.userId.toString())) {
                    userIds.push(subscriber.userId.toString());
                }
            });

            const fetchUsers = await UserModel.find({ _id: { $in: userIds } });

            // Fetch standards based scale

            const gradingScale = await GradingScaleModel.findById(fetchChannel.standardsBasedGradingScale);

            if (!gradingScale) return null;

            // Fetch all the standards first

            const fetchStandards = await StandardsModel.find({
                channelId,
            });

            let standardsEntries: any[] = [];

            /**
             * {
             *   category1: {
             *         'user1': [1, 2, 3],
             *         'user2': [2, 3, 4],
             *   },
             *   category2: {
             *         'user1': [1, 2, 3],
             *         'user2': [2, 3, 4],
             *   },
             * }
             */
            const categoryMap: any = {};

            for (let i = 0; i < fetchStandards.length; i++) {
                // For each standard we need to construct a map of scores for each student
                const standard = fetchStandards[i];

                let userScores: any = [];

                for (let j = 0; j < fetchUsers.length; j++) {
                    const user = fetchUsers[j];

                    const standardScore = await StandardsScoresModel.find({
                        standardId: standard._id,
                        userId: user._id,
                    });

                    // Calculate total based on the scale that was selected

                    let overriddenScore = undefined;

                    const allPoints = standardScore.map((score: any) => {
                        if (score.overridden) {
                            overriddenScore = score.points;
                        }

                        return score.points;
                    });

                    let total: number = -1;

                    // We return overridden score for the user
                    if (overriddenScore) {
                        total = overriddenScore;
                        // Calculate the total points based on the grading scale selected
                    } else if (allPoints.length > 0) {
                        // We return undefined to indicate that the score has not been assigned

                        switch (gradingScale.standardsGradeMode) {
                            case 'mean':
                                const meanPoints = ss.mean(allPoints);
                                total = Math.round((meanPoints + Number.EPSILON) * 100) / 100;
                                break;
                            case 'mode':
                                total = ss.modeSorted(allPoints);
                                break;
                            case 'highest':
                                total = ss.max(allPoints);
                                break;
                            case 'mostRecent':
                                total = allPoints[allPoints.length - 1];
                                break;
                            case 'decayingAverage':
                                if (allPoints.length === 1) {
                                    total = allPoints[0];
                                } else if (allPoints.length === 2) {
                                    const meanPoints = ss.mean(allPoints);
                                    total = Math.round((meanPoints + Number.EPSILON) * 100) / 100;
                                } else {
                                    // [1, 2, 2]
                                    const firstArr = allPoints.slice(0, allPoints.length - 1);
                                    const secondArr = allPoints.slice(allPoints.length - 1);

                                    const meanFirstArr = ss.mean(firstArr);
                                    const calculateDecayAvg = (meanFirstArr + secondArr[0]) / 2;

                                    total = Math.round((calculateDecayAvg + Number.EPSILON) * 100) / 100;
                                }
                                break;
                            default:
                                return;
                        }
                    } else {
                        total = -1;
                    }

                    // Push total for Category Map and for User Map
                    let category: string = standard.category ? standard.category : '';
                    let mastery = undefined;
                    let masteryPoints = undefined;

                    if (total !== -1) {
                        if (categoryMap[category]) {
                            if (categoryMap[category][user?._id]) {
                                const updateScores = [...categoryMap[category][user?._id]];
                                updateScores.push(total);
                                categoryMap[category][user?._id] = updateScores;
                            } else {
                                categoryMap[category][user?._id] = [total];
                            }
                        } else {
                            const userMap: any = {};

                            userMap[user?._id] = [total];

                            categoryMap[category] = userMap;
                        }

                        // Calculate mastery from range;
                        let smallestDiff = Number.POSITIVE_INFINITY;

                        gradingScale.range.map((level: any) => {
                            const diff = Math.abs(level.points - total);

                            if (diff < smallestDiff) {
                                mastery = level.name;
                                masteryPoints = level.points;
                            }

                            smallestDiff = diff;
                        });
                    } else {
                        if (!categoryMap[category]) {
                            categoryMap[category] = {};
                        }
                    }

                    userScores.push({
                        userId: user?._id,
                        points: total === -1 ? undefined : total,
                        overridden: overriddenScore ? true : false,
                        mastery,
                        masteryPoints,
                    });
                }

                // Push into entries
                standardsEntries.push({
                    _id: standard._id,
                    title: standard.title,
                    description: standard.description,
                    category: standard.category,
                    scores: userScores,
                });
            }

            const categoryEntries: any[] = [];

            //
            for (let i = 0; i < Object.keys(categoryMap).length; i++) {
                const category = Object.keys(categoryMap)[i];

                const categoryScores = categoryMap[category];

                let userTotals: any[] = [];

                for (let j = 0; j < fetchUsers.length; j++) {
                    const userId = fetchUsers[j]._id;

                    if (categoryScores[userId]) {
                        const scores = categoryScores[userId];

                        const mean = ss.mean(scores);

                        let mastery;
                        let masteryPoints;

                        // Calculate mastery from range;
                        let smallestDiff = Number.POSITIVE_INFINITY;

                        gradingScale.range.map((level: any) => {
                            const diff = Math.abs(level.points - mean);

                            if (diff < smallestDiff) {
                                mastery = level.name;
                                masteryPoints = level.points;
                            }

                            smallestDiff = diff;
                        });

                        userTotals.push({
                            userId,
                            points: Math.round((mean + Number.EPSILON) * 100) / 100,
                            mastery,
                            masteryPoints,
                        });
                    } else {
                        userTotals.push({
                            userId,
                            points: undefined,
                        });
                    }
                }

                categoryEntries.push({
                    category,
                    scores: userTotals,
                });
            }

            const users = fetchUsers.map((user: any) => {
                return {
                    userId: user._id,
                    fullName: user.fullName,
                    avatar: user.avatar,
                };
            });

            return {
                entries: standardsEntries,
                totals: categoryEntries,
                users,
            };
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }

    // Students Standards
    @Field((type) => StandardsGradebookStudentObject, {
        description: 'Returns list of channels created by a user.',
        nullable: true,
    })
    public async getStandardsGradebookStudent(
        @Arg('channelId', (type) => String)
        channelId: string,
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            // Fetch all course students after that
            const fetchChannel = await ChannelModel.findById(channelId);

            if (!fetchChannel) return null;

            // Fetch standards based scale

            const gradingScale = await GradingScaleModel.findById(fetchChannel.standardsBasedGradingScale);

            if (!gradingScale) return null;

            // Fetch all the standards first
            const fetchStandards = await StandardsModel.find({
                channelId,
            });

            let standardsEntries: any[] = [];

            /**
             * {
             *   category1: [1, 2, 3],
             *   category2: [3, 3, 2]
             * }
             */
            const categoryMap: any = {};

            for (let i = 0; i < fetchStandards.length; i++) {
                // For each standard we need to construct a map of scores for each student
                const standard = fetchStandards[i];

                const standardScore = await StandardsScoresModel.find({
                    standardId: standard._id,
                    userId,
                });

                // Calculate total based on the scale that was selected

                let overriddenScore = undefined;

                const allPoints = standardScore.map((score: any) => {
                    if (score.overridden) {
                        overriddenScore = score.points;
                    }

                    return score.points;
                });

                let total: number = -1;

                // We return overridden score for the user
                if (overriddenScore) {
                    total = overriddenScore;
                    // Calculate the total points based on the grading scale selected
                } else if (allPoints.length > 0) {
                    // We return undefined to indicate that the score has not been assigned

                    switch (gradingScale.standardsGradeMode) {
                        case 'mean':
                            const meanPoints = ss.mean(allPoints);
                            total = Math.round((meanPoints + Number.EPSILON) * 100) / 100;
                            break;
                        case 'mode':
                            total = ss.modeSorted(allPoints);
                            break;
                        case 'highest':
                            total = ss.max(allPoints);
                            break;
                        case 'mostRecent':
                            total = allPoints[allPoints.length - 1];
                            break;
                        case 'decayingAverage':
                            if (allPoints.length === 1) {
                                total = allPoints[0];
                            } else if (allPoints.length === 2) {
                                const meanPoints = ss.mean(allPoints);
                                total = Math.round((meanPoints + Number.EPSILON) * 100) / 100;
                            } else {
                                // [1, 2, 2]
                                const firstArr = allPoints.slice(0, allPoints.length - 1);
                                const secondArr = allPoints.slice(allPoints.length - 1);

                                const meanFirstArr = ss.mean(firstArr);
                                const calculateDecayAvg = (meanFirstArr + secondArr[0]) / 2;

                                total = Math.round((calculateDecayAvg + Number.EPSILON) * 100) / 100;
                            }
                            break;
                        default:
                            return;
                    }
                } else {
                    total = -1;
                }

                // Push total for Category Map and for User Map
                let category: string = standard.category ? standard.category : '';
                let mastery = undefined;
                let masteryPoints = undefined;

                if (total !== -1) {
                    if (categoryMap[category]) {
                        const updateScores = [...categoryMap[category]];
                        updateScores.push(total);
                        categoryMap[category] = updateScores;
                    } else {
                        categoryMap[category] = [total];
                    }

                    // Calculate mastery from range;
                    let smallestDiff = Number.POSITIVE_INFINITY;

                    gradingScale.range.map((level: any) => {
                        const diff = Math.abs(level.points - total);

                        if (diff < smallestDiff) {
                            mastery = level.name;
                            masteryPoints = level.points;
                        }

                        smallestDiff = diff;
                    });
                }

                // Push into entries
                standardsEntries.push({
                    _id: standard._id,
                    title: standard.title,
                    description: standard.description,
                    category: standard.category,
                    points: total === -1 ? undefined : total,
                    overridden: overriddenScore ? true : false,
                    mastery,
                    masteryPoints,
                });
            }

            const categoryEntries: any[] = [];

            //
            for (let i = 0; i < Object.keys(categoryMap).length; i++) {
                const category = Object.keys(categoryMap)[i];

                const scores = categoryMap[category];

                const mean = ss.mean(scores);

                let mastery;
                let masteryPoints;

                // Calculate mastery from range;
                let smallestDiff = Number.POSITIVE_INFINITY;

                gradingScale.range.map((level: any) => {
                    const diff = Math.abs(level.points - mean);

                    if (diff < smallestDiff) {
                        mastery = level.name;
                        masteryPoints = level.points;
                    }

                    smallestDiff = diff;
                });

                categoryEntries.push({
                    category,
                    points: Math.round((mean + Number.EPSILON) * 100) / 100,
                    mastery,
                    masteryPoints,
                });
            }

            return {
                entries: standardsEntries,
                totals: categoryEntries,
            };
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }

    @Field((type) => StandardsInsightsObject, {
        description: 'Returns list of channels created by a user.',
        nullable: true,
    })
    public async getStandardsInsights(
        @Arg('channelId', (type) => String)
        channelId: string,
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('standardId', (type) => String)
        standardId: string
    ) {
        try {
            const fetchChannel = await ChannelModel.findById(channelId);

            if (!fetchChannel) return null;

            const gradingScale = await GradingScaleModel.findById(fetchChannel.standardsBasedGradingScale);

            if (!gradingScale) return null;

            //
            const getStandardScores = await StandardsScoresModel.find({
                userId,
                standardId,
            });

            //
            if (getStandardScores.length > 0) {
                let overriddenScore = undefined;

                const allPoints = getStandardScores.map((score: any) => {
                    if (score.overridden) {
                        overriddenScore = score.points;
                    }

                    return score.points;
                });

                let total: number = -1;

                // We return overridden score for the user
                if (overriddenScore) {
                    total = overriddenScore;
                    // Calculate the total points based on the grading scale selected
                } else if (allPoints.length > 0) {
                    // We return undefined to indicate that the score has not been assigned

                    switch (gradingScale.standardsGradeMode) {
                        case 'mean':
                            const meanPoints = ss.mean(allPoints);
                            total = Math.round((meanPoints + Number.EPSILON) * 100) / 100;
                            break;
                        case 'mode':
                            total = ss.modeSorted(allPoints);
                            break;
                        case 'highest':
                            total = ss.max(allPoints);
                            break;
                        case 'mostRecent':
                            total = allPoints[allPoints.length - 1];
                            break;
                        case 'decayingAverage':
                            if (allPoints.length === 1) {
                                total = allPoints[0];
                            } else if (allPoints.length === 2) {
                                const meanPoints = ss.mean(allPoints);
                                total = Math.round((meanPoints + Number.EPSILON) * 100) / 100;
                            } else {
                                // [1, 2, 2]
                                const firstArr = allPoints.slice(0, allPoints.length - 1);
                                const secondArr = allPoints.slice(allPoints.length - 1);

                                const meanFirstArr = ss.mean(firstArr);
                                const calculateDecayAvg = (meanFirstArr + secondArr[0]) / 2;

                                total = Math.round((calculateDecayAvg + Number.EPSILON) * 100) / 100;
                            }
                            break;
                        default:
                            return;
                    }
                } else {
                    total = -1;
                }

                let mastery = undefined;
                let masteryPoints = undefined;

                if (total !== -1) {
                    // Calculate mastery from range;
                    let smallestDiff = Number.POSITIVE_INFINITY;

                    gradingScale.range.map((level: any) => {
                        const diff = Math.abs(level.points - total);

                        if (diff < smallestDiff) {
                            mastery = level.name;
                            masteryPoints = level.points;
                        }

                        smallestDiff = diff;
                    });
                }

                const scoresToReturn = getStandardScores.map((score: any) => {
                    return {
                        _id: score._id,
                        points: score.points,
                        createdAt: score.createdAt,
                        overridden: score.overridden ? true : false,
                    };
                });

                return {
                    scores: scoresToReturn,
                    total: total === -1 ? undefined : total,
                    mastery,
                    masteryPoints,
                    overridden: overriddenScore ? true : false,
                };
            } else {
                return {
                    scores: undefined,
                    total: undefined,
                    mastery: undefined,
                    masteryPoints: undefined,
                    overridden: false,
                };
            }
        } catch (e) {
            console.log('Error', e);
            return {
                scores: undefined,
                total: undefined,
                mastery: undefined,
                masteryPoints: undefined,
                overridden: false,
            };
        }
    }

    @Field((type) => [String], {
        description: 'Returns list of channels created by a user.',
        nullable: true,
    })
    public async getStandardsCategories(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            const fetchStandards = await StandardsModel.find({
                channelId,
            });

            const categoriesSet = new Set();

            fetchStandards.map((standard: any) => {
                categoriesSet.add(standard.category);
            });

            return Array.from(categoriesSet);
        } catch (e) {
            return false;
        }
    }
}
