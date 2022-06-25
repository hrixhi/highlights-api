import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelObject } from './types/Channel.type';
import { ChannelModel } from './mongo/Channel.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { UserModel } from '../user/mongo/User.model';
import { GradeObject } from '../modification/types/Modification.type';
import { CueObject } from '../cue/types/Cue.type';
import { SubmissionStatisticObject } from './types/SubmissionStatistic.type';
import { GroupModel } from '../group/mongo/Group.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';

import * as ss from 'simple-statistics';
import { LectureRecording } from '../dates/types/Date.type';
import { UserObject } from '../user/types/User.type';
import { DateModel } from '../dates/mongo/dates.model';
import axios from 'axios';
import { MeetingStatusObject } from './types/MeetingStatus.type';
import { zoomClientId, zoomClientSecret } from '../../../helpers/zoomCredentials';
import { SchoolsModel } from '../school/mongo/School.model';
import { ZoomRegistrationModel } from '../zoom-registration/mongo/zoom-registration.model';
import { GradingScaleObject } from '../grading-scale/types/GradingScaleObject.types';
import { GradingScaleModel } from '../grading-scale/mongo/gradingScale.model';

/**
 * Channel Query Endpoints
 */
@ObjectType()
export class ChannelQueryResolver {
    @Field((type) => [ChannelObject], {
        description: 'Returns list of channels created by a user.',
        nullable: true,
    })
    public async getChannelsOutside(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            const activeSubscriptions = await SubscriptionModel.find({
                $and: [{ userId }, { keepContent: { $ne: false } }, { unsubscribedAt: { $exists: false } }],
            });

            const channelIds: any[] = [];

            activeSubscriptions.map((sub: any) => channelIds.push(sub.channelId));

            return await ChannelModel.find({
                _id: { $in: channelIds },
            });
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => [UserObject], {
        description: 'Returns list of subscribers for by a user.',
        nullable: true,
    })
    public async getChannelModerators(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            const channel = await ChannelModel.findById(channelId);

            if (channel && channel.owners) {
                return await UserModel.find({
                    _id: { $in: channel.owners },
                });
            } else {
                return [];
            }
        } catch (e) {
            return [];
        }
    }

    @Field((type) => [ChannelObject], {
        description: 'Returns list of channels created by a user.',
        nullable: true,
    })
    public async findByUserId(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            return await ChannelModel.find({
                $or: [
                    {
                        createdBy: userId,
                    },
                    {
                        owners: userId,
                    },
                ],
                creatorUnsubscribed: { $ne: true },
                deletedAt: { $exists: false },
            });
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => ChannelObject, {
        description: 'Returns channel by id.',
        nullable: true,
    })
    public async findById(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            return await ChannelModel.findById(channelId);
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    @Field((type) => [ChannelObject], {
        description: 'Returns list of channels belonging to channel.',
        nullable: true,
    })
    public async findBySchoolId(
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            const users = await UserModel.find({ schoolId });
            const userIds: any[] = [];
            users.map((u: any) => {
                userIds.push(u._id);
            });

            const channels = await ChannelModel.find({
                createdBy: { $in: userIds },
                creatorUnsubscribed: { $ne: true },
                deletedAt: { $exists: false },
            });

            return channels;
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => String, {
        description: 'Returns "password-required", "password-not-required", "non-existant" statuses for a channel',
    })
    public async getChannelStatusForCode(@Arg('accessCode', (type) => String) accessCode: string) {
        try {
            const channel = await ChannelModel.findOne({
                accessCode,
            });
            if (channel) {
                if (channel.password && channel.password !== '') {
                    return 'password-required:' + channel._id.toString();
                } else {
                    return 'password-not-required:' + channel._id.toString();
                }
            } else {
                return 'non-existant';
            }
        } catch (e) {
            return 'non-existant';
        }
    }

    @Field((type) => String, {
        description: 'Returns "password-required", "password-not-required", "non-existant" statuses for a channel',
    })
    public async getChannelStatus(@Arg('channelId', (type) => String) channelId: string) {
        try {
            const channel = await ChannelModel.findById(channelId);
            if (channel) {
                if (channel.password && channel.password !== '') {
                    return 'password-required';
                } else {
                    return 'password-not-required';
                }
            } else {
                return 'non-existant';
            }
        } catch (e) {
            return 'non-existant';
        }
    }

    @Field((type) => [String], {
        description: 'Returns list of channel categories.',
    })
    public async getChannelCategories(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            const channelCues = await CueModel.find({
                channelId,
            });
            const categoryObject: any = {};
            channelCues.map((item: any) => {
                if (item.customCategory && item.customCategory !== '') {
                    if (!categoryObject[item.customCategory]) {
                        categoryObject[item.customCategory] = 'category';
                    }
                }
            });
            const categoryArray: string[] = [];
            Object.keys(categoryObject).map((key: string) => {
                categoryArray.push(key);
            });
            return categoryArray;
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => [CueObject], {
        description: 'Returns a list of submission cues.',
    })
    public async getSubmissionCues(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            return await CueModel.find({ channelId, submission: true });
        } catch (e) {
            return [];
        }
    }

    @Field((type) => String, {
        description: 'Returns a list of submission cues.',
    })
    public async getChannelColorCode(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            const channel = await ChannelModel.findById(channelId);
            if (channel && channel.colorCode !== undefined && channel.colorCode !== null) {
                return channel.colorCode;
            } else {
                return '';
            }
        } catch (e) {
            return '';
        }
    }

    @Field((type) => [GradeObject], {
        description: 'Returns a list of grade object.',
    })
    public async getGrades(
        @Arg('channelId', (type) => String)
        channelId: string,
        @Arg('userId', (type) => String, { nullable: true })
        userId?: string
    ) {
        try {
            // Fetch Channel
            const fetchChannel = await ChannelModel.findById(channelId);

            if (!fetchChannel) return [];

            let isOwner = false;

            const c = fetchChannel.toObject();

            console.log('c.createdBy', c.createdBy.toString());
            console.log('userId', userId);

            if (userId && c.createdBy.toString() === userId.toString()) {
                isOwner = true;
            } else if (userId && c.owners && c.owners.includes(userId)) {
                isOwner = true;
            }

            console.log('Is Owner', isOwner);

            if (isOwner || !userId) {
                const gradedData: any = await ModificationsModel.find({
                    channelId,
                    submission: true,
                });
                const gradesObject: any = {};
                const userIds: any = [];

                gradedData.map((mod: any) => {
                    const modification = mod.toObject();
                    if (gradesObject[modification.userId]) {
                        gradesObject[modification.userId].push({
                            score: modification.score,
                            gradeWeight: modification.gradeWeight,
                            cueId: modification.cueId,
                            graded: modification.graded,
                            submittedAt: modification.submittedAt,
                            releaseSubmission: modification.releaseSubmission,
                        });
                    } else {
                        userIds.push(modification.userId);
                        gradesObject[modification.userId] = [
                            {
                                score: modification.score,
                                gradeWeight: modification.gradeWeight,
                                cueId: modification.cueId,
                                graded: modification.graded,
                                submittedAt: modification.submittedAt,
                                releaseSubmission: modification.releaseSubmission,
                            },
                        ];
                    }
                });
                const users: any = await UserModel.find({ _id: { $in: userIds } });
                const grades: any[] = [];

                // const channel: any = await ChannelModel.findById(channelId);

                let owners: any[] = [];

                owners = fetchChannel.owners
                    ? [...fetchChannel.owners, fetchChannel.createdBy.toString()]
                    : [fetchChannel.createdBy.toString()];

                // Fetch all existing Subscibers for that course
                const activeSubs = await SubscriptionModel.find({
                    channelId,
                    unsubscribedAt: { $exists: false },
                });

                const activeUserIds = activeSubs.map((subscriber: any) => {
                    const sub = subscriber.toObject();

                    return sub.userId.toString();
                });

                // Filter channel owners data out
                const filteredUsers = users.filter((u: any) => {
                    const user = u.toObject();
                    return activeUserIds.includes(user._id.toString()) && !owners.includes(user._id.toString());
                });

                filteredUsers.map((u: any) => {
                    const user = u.toObject();
                    grades.push({
                        userId: user._id,
                        displayName: user.displayName,
                        fullName: user.fullName,
                        email: user.email && user.email !== '' ? user.email : '',
                        avatar: user.avatar && user.avatar !== '' ? user.avatar : '',
                        scores: gradesObject[user._id] ? gradesObject[user._id] : [],
                    });
                });

                return grades;
            } else {
                let userScores: any[] = [];

                const gradedData: any = await ModificationsModel.find({
                    channelId,
                    submission: true,
                    userId,
                });

                gradedData.map((modification: any) => {
                    userScores.push({
                        score: modification.releaseSubmission && modification.graded ? modification.score : undefined,
                        gradeWeight: modification.gradeWeight,
                        cueId: modification.cueId,
                        graded: modification.graded,
                        submittedAt: modification.submittedAt,
                        releaseSubmission: modification.releaseSubmission,
                    });
                });

                const fetchUser = await UserModel.findById(userId);

                if (!fetchUser) return [];

                const user = fetchUser.toObject();

                return [
                    {
                        userId: user._id,
                        displayName: user.displayName,
                        fullName: user.fullName,
                        email: user.email && user.email !== '' ? user.email : '',
                        scores: userScores,
                    },
                ];
            }
        } catch (e) {
            return [];
        }
    }

    @Field((type) => Boolean, {
        description: 'Returns status of channel meeting.',
    })
    public async getMeetingStatus(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            const c = await ChannelModel.findById(channelId);
            if (c) {
                const channel = c.toObject();
                return channel.meetingOn ? channel.meetingOn : false;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Returns true if channel can be deleted/is temporary.',
    })
    public async isChannelTemporary(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            const c = await ChannelModel.findById(channelId);
            if (c) {
                const channel = c.toObject();
                if (channel.temporary) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => [MeetingStatusObject], {
        description: 'Fetch any ongoing meetings and returns URLs for them',
    })
    public async ongoingMeetings(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            let isOwner = false;

            const c = await ChannelModel.findById(channelId);
            const u: any = await UserModel.findById(userId);

            if (c && u) {
                const user = u.toObject();
                const channel = c.toObject();

                if (channel.owners) {
                    channel.owners.map((uId: any) => {
                        if (uId.toString().trim() === userId.toString().trim()) {
                            isOwner = true;
                        }
                    });
                }
                if (channel.createdBy.toString().trim() === userId.toString().trim()) {
                    isOwner = true;
                }

                let useZoom = true;

                if (user.schoolId) {
                    const org = await SchoolsModel.findById(user.schoolId);

                    if (org && org.meetingProvider && org.meetingProvider !== '') {
                        useZoom = false;
                    }
                }

                let dates: any[] = [];

                if (useZoom) {
                    dates = await DateModel.find({
                        scheduledMeetingForChannelId: channelId,
                        isNonMeetingChannelEvent: { $ne: true },
                        zoomMeetingId: { $ne: undefined },
                        zoomMeetingScheduledBy: { $ne: undefined },
                        start: { $lte: new Date() },
                        end: { $gte: new Date() },
                    });
                } else {
                    dates = await DateModel.find({
                        scheduledMeetingForChannelId: channelId,
                        isNonMeetingChannelEvent: { $ne: true },
                        start: { $lte: new Date() },
                        end: { $gte: new Date() },
                    });
                }

                let meetings: any[] = [];

                if (dates.length === 0) {
                    return [];
                } else if (useZoom) {
                    for (let i = 0; i < dates.length; i++) {
                        const meet = dates[i];

                        let accessToken = '';

                        const zoomMeetingScheduledBy = meet.zoomMeetingScheduledBy;
                        const meetingId = meet.zoomMeetingId;

                        const u = await UserModel.findOne({
                            _id: zoomMeetingScheduledBy,
                        });

                        if (u) {
                            const user = u.toObject();

                            const b = Buffer.from(zoomClientId + ':' + zoomClientSecret);

                            const date = new Date();
                            const expiresOn = new Date(user.zoomInfo.expiresOn);

                            if (expiresOn <= date) {
                                // refresh access token

                                const zoomRes: any = await axios.post(
                                    `https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${user.zoomInfo.refreshToken}`,
                                    undefined,
                                    {
                                        headers: {
                                            Authorization: `Basic ${b.toString('base64')}`,
                                            'Content-Type': 'application/x-www-form-urlencoded',
                                        },
                                    }
                                );

                                if (zoomRes.status !== 200) {
                                    return 'error';
                                }

                                const zoomData: any = zoomRes.data;

                                const eOn = new Date();
                                eOn.setSeconds(
                                    eOn.getSeconds() +
                                        (Number.isNaN(Number(zoomData.expires_in)) ? 0 : Number(zoomData.expires_in))
                                );

                                accessToken = zoomData.access_token;

                                await UserModel.updateOne(
                                    { _id: zoomMeetingScheduledBy },
                                    {
                                        zoomInfo: {
                                            ...user.zoomInfo,
                                            accessToken: zoomData.access_token,
                                            refreshToken: zoomData.refresh_token,
                                            expiresOn: eOn, // saved as a date
                                        },
                                    }
                                );
                            } else {
                                accessToken = user.zoomInfo.accessToken;
                            }

                            // create meeting
                            const zoomRes: any = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                },
                            });

                            if (zoomRes.status !== 200 && zoomRes.status !== 201) {
                                return;
                            }

                            const zoomData: any = zoomRes.data;

                            if (zoomData.id) {
                                // Check if registrations exists and if so then return the registration join url
                                const registrationZoom = await ZoomRegistrationModel.findOne({
                                    zoomMeetingId: zoomData.id.toString(),
                                    userId,
                                    channelId,
                                });

                                // Create a new Date
                                meetings.push({
                                    title: meet.title,
                                    description: meet.description,
                                    startUrl: isOwner ? zoomData.start_url : '',
                                    joinUrl: registrationZoom ? registrationZoom.zoom_join_url : zoomData.join_url,
                                    error: '',
                                    start: meet.start,
                                    end: meet.end,
                                });
                            } else {
                                return;
                            }
                        }
                    }

                    return meetings;
                } else {
                    for (let i = 0; i < dates.length; i++) {
                        const meet = dates[i];

                        meetings.push({
                            title: meet.title,
                            description: meet.description,
                            startUrl: '',
                            joinUrl: channel.meetingUrl ? channel.meetingUrl : '',
                            error: '',
                            start: meet.start,
                            end: meet.end,
                        });
                    }

                    return meetings;
                }
            }
            return false;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => [ChannelObject], {
        description: 'Returns list of channels belonging to channel.',
        nullable: true,
    })
    public async getSchoolCourses(
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            const channels = await ChannelModel.find({
                schoolId,
                deletedAt: undefined,
            });

            return channels;
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => [UserObject], {
        description: 'Returns a list of users.',
    })
    public async getCourseStudents(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            const fetchChannel = await ChannelModel.findById(channelId);

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

            return fetchUsers;
        } catch (e) {
            return [];
        }
    }

    @Field((type) => GradingScaleObject, {
        description: 'Returns scale if allotted else null if standards based grading is not enabled.',
        nullable: true,
    })
    public async getStandardsBasedGradingScale(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            const fetchChannel = await ChannelModel.findById(channelId);

            if (!fetchChannel || !fetchChannel.standardsBasedGradingScale) return null;

            // First check if standards based grading enabled with ORG
            const fetchSchool = await SchoolsModel.findById(fetchChannel?.schoolId);

            if (!fetchSchool || !fetchSchool.enableStandardsBasedGrading) return null;

            // Get grading scale

            const gradingScale = await GradingScaleModel.findById(fetchChannel.standardsBasedGradingScale);

            if (!gradingScale) {
                return null;
            } else {
                return gradingScale;
            }
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }

    @Field((type) => GradingScaleObject, {
        description: 'Returns scale if allotted else null if standards based grading is not enabled.',
        nullable: true,
    })
    public async getCourseGradingScale(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            const fetchChannel = await ChannelModel.findById(channelId);

            if (!fetchChannel || !fetchChannel.gradingScale) return null;

            // Get grading scale

            const gradingScale = await GradingScaleModel.findById(fetchChannel.gradingScale);

            if (!gradingScale) {
                return null;
            } else {
                return gradingScale;
            }
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }
}
