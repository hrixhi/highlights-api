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

/**
 * Channel Query Endpoints
 */
@ObjectType()
export class ChannelQueryResolver {
    @Field(type => [ChannelObject], {
        description: 'Returns list of channels created by a user.',
        nullable: true
    })
    public async getChannelsOutside(
        @Arg('userId', type => String)
        userId: string
    ) {
        try {
            const activeSubscriptions = await SubscriptionModel.find({
                $and: [{ userId }, { keepContent: { $ne: false } }, { unsubscribedAt: { $exists: false } }]
            });

            const channelIds: any[] = [];

            activeSubscriptions.map((sub: any) => channelIds.push(sub.channelId));

            return await ChannelModel.find({
                _id: { $in: channelIds }
            });
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    // @Field(type => [UserObject], {
    //     description: "Returns list of subscribers for by a user.",
    //     nullable: true
    // })
    // public async getChannelSubscribers(
    //     @Arg("channelId", type => String)
    //     channelId: string
    // ) {
    //     try {
    //         const activeSubscriptions = await SubscriptionModel.find({
    //             $and: [
    //               { channelId },
    //               { keepContent: { $ne: false } },
    //               { unsubscribedAt: { $exists: false } }
    //             ]
    //           })

    //         const subscribers: any[] = []

    //         activeSubscriptions.map((sub: any) => subscribers.push(sub.userId))

    //         return await UserModel.find({
    //             _id: { $in: subscribers }
    //         })
    //     } catch (e) {
    //         return [];
    //     }

    // }

    @Field(type => [UserObject], {
        description: 'Returns list of subscribers for by a user.',
        nullable: true
    })
    public async getChannelModerators(
        @Arg('channelId', type => String)
        channelId: string
    ) {
        try {
            const channel = await ChannelModel.findById(channelId);

            if (channel && channel.owners) {
                return await UserModel.find({
                    _id: { $in: channel.owners }
                });
            } else {
                return [];
            }
        } catch (e) {
            return [];
        }
    }

    @Field(type => [ChannelObject], {
        description: 'Returns list of channels created by a user.',
        nullable: true
    })
    public async findByUserId(
        @Arg('userId', type => String)
        userId: string
    ) {
        try {
            return await ChannelModel.find({
                $or: [
                    {
                        createdBy: userId
                    },
                    {
                        owners: userId
                    }
                ],
                creatorUnsubscribed: { $ne: true }
            });
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field(type => ChannelObject, {
        description: 'Returns channel by name.',
        nullable: true
    })
    public async findByName(
        @Arg('name', type => String)
        name: string
    ) {
        try {
            return await ChannelModel.findOne({ name });
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field(type => ChannelObject, {
        description: 'Returns channel by id.',
        nullable: true
    })
    public async findById(
        @Arg('channelId', type => String)
        channelId: string
    ) {
        try {
            return await ChannelModel.findById(channelId);
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    @Field(type => [ChannelObject], {
        description: 'Returns list of channels belonging to channel.',
        nullable: true
    })
    public async findBySchoolId(
        @Arg('schoolId', type => String)
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
                creatorUnsubscribed: { $ne: true }
            });

            return channels;
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field(type => String, {
        description: 'Returns "password-required", "password-not-required", "non-existant" statuses for a channel'
    })
    public async getChannelStatusForCode(@Arg('accessCode', type => String) accessCode: string) {
        try {
            const channel = await ChannelModel.findOne({
                accessCode
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

    @Field(type => String, {
        description: 'Returns "password-required", "password-not-required", "non-existant" statuses for a channel'
    })
    public async getChannelStatus(@Arg('channelId', type => String) channelId: string) {
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

    @Field(type => [String], {
        description: 'Returns list of channel categories.'
    })
    public async getChannelCategories(
        @Arg('channelId', type => String)
        channelId: string
    ) {
        try {
            const channelCues = await CueModel.find({
                channelId
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

    @Field(type => String, {
        description: 'Returns meeting link.'
    })
    public async getMeetingLink(
        @Arg('channelId', type => String)
        channelId: string,
        @Arg('userId', type => String)
        userId: string
    ) {
        try {
            const u: any = await UserModel.findById(userId);
            const c: any = await ChannelModel.findById(channelId);
            if (u && c) {
                const user = u.toObject();
                const channel = c.toObject();
                const sha1 = require('sha1');
                const vdoURL = 'https://my2.vdo.click/bigbluebutton/api/';
                const vdoKey = 'KgX9F6EE0agJzRSU9DVDh5wc2U4OvtGJ0mtJHfh97YU';
                const atendeePass = channelId;
                const modPass = channel.createdBy;
                const fullName = encodeURIComponent(
                    encodeURI(
                        user.displayName
                            .replace(/[^a-z0-9]/gi, '')
                            .split(' ')
                            .join('')
                            .trim()
                    )
                );
                const params =
                    'fullName=' +
                    (fullName.length > 0 ? fullName : Math.floor(Math.random() * (999 - 100 + 1) + 100).toString()) +
                    '&meetingID=' +
                    channelId +
                    '&password=' +
                    (channel.createdBy.toString().trim() === user._id.toString().trim() ? modPass : atendeePass);
                const toHash = 'join' + params + vdoKey;
                const checksum = sha1(toHash);
                return vdoURL + 'join?' + params + '&checksum=' + checksum;
            } else {
                return 'error';
            }
        } catch (e) {
            return 'error';
        }
    }

    @Field(type => String, {
        description: 'Returns meeting link that can be shared.'
    })
    public async getSharableLink(
        @Arg('channelId', type => String)
        channelId: string,
        @Arg('moderator', type => Boolean)
        moderator: boolean
    ) {
        try {
            const c: any = await ChannelModel.findById(channelId);
            if (c) {
                const channel = c.toObject();
                const sha1 = require('sha1');
                const vdoURL = 'https://my2.vdo.click/bigbluebutton/api/';
                const vdoKey = 'KgX9F6EE0agJzRSU9DVDh5wc2U4OvtGJ0mtJHfh97YU';
                const atendeePass = channelId;
                const modPass = channel.createdBy;
                const fullName = moderator ? 'instructor' : 'guest';
                const params =
                    'fullName=' +
                    fullName +
                    '&meetingID=' +
                    channelId +
                    '&password=' +
                    (moderator ? modPass : atendeePass);
                const toHash = 'join' + params + vdoKey;
                const checksum = sha1(toHash);
                return vdoURL + 'join?' + params + '&checksum=' + checksum;
            } else {
                return 'error';
            }
        } catch (e) {
            return 'error';
        }
    }

    @Field(type => String, {
        description: 'Returns meeting link.'
    })
    public async getPersonalMeetingLink(
        @Arg('users', type => [String])
        users: string[],
        @Arg('userId', type => String)
        userId: string
    ) {
        try {
            const u: any = await UserModel.findById(userId);
            const groupDoc: any = await GroupModel.findOne({
                users: { $all: users }
            });
            const groupId = groupDoc._id;
            if (u) {
                const user = u.toObject();
                const sha1 = require('sha1');
                const vdoURL = 'https://my2.vdo.click/bigbluebutton/api/';
                const vdoKey = 'KgX9F6EE0agJzRSU9DVDh5wc2U4OvtGJ0mtJHfh97YU';
                const fullName = encodeURIComponent(
                    encodeURI(
                        user.displayName
                            .replace(/[^a-z0-9]/gi, '')
                            .split(' ')
                            .join('')
                            .trim()
                    )
                );
                const params =
                    'fullName=' +
                    (fullName.length > 0 ? fullName : Math.floor(Math.random() * (999 - 100 + 1) + 100).toString()) +
                    '&meetingID=' +
                    groupId +
                    '&password=' +
                    groupId;
                const toHash = 'join' + params + vdoKey;
                const checksum = sha1(toHash);
                return vdoURL + 'join?' + params + '&checksum=' + checksum;
            } else {
                return 'error';
            }
        } catch (e) {
            return 'error';
        }
    }

    @Field(type => Boolean, {
        description: 'Returns meeting link status.'
    })
    public async getPersonalMeetingLinkStatus(
        @Arg('users', type => [String])
        users: string[]
    ) {
        try {
            const groupDoc: any = await GroupModel.findOne({
                users: { $all: users }
            });
            if (groupDoc) {
                const group = groupDoc.toObject();
                if (group && group.meetingOn) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    @Field(type => [CueObject], {
        description: 'Returns a list of submission cues.'
    })
    public async getSubmissionCues(
        @Arg('channelId', type => String)
        channelId: string
    ) {
        try {
            return await CueModel.find({ channelId, submission: true });
        } catch (e) {
            return [];
        }
    }

    @Field(type => String, {
        description: 'Returns a list of submission cues.'
    })
    public async getChannelColorCode(
        @Arg('channelId', type => String)
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

    @Field(type => [SubmissionStatisticObject], {
        description: 'Returns a list of submission cues.'
    })
    public async getSubmissionCuesStatistics(
        @Arg('channelId', type => String)
        channelId: string
    ) {
        try {
            // const submissionCues = await CueModel.find({ channelId, submission: true });

            const gradedData: any = await ModificationsModel.find({
                channelId,
                submission: true
            });

            // Construct the total statistics - Minimum, Median, Maximum, Mean, STD Deviation

            // Need an array of scores for all the submission Cues

            // test with channel id 60ab11233e057c171516eea4

            let cueScores: any = {};

            gradedData.forEach((mod: any) => {
                const modification = mod.toObject();

                if (modification.score !== undefined) {
                    if (cueScores[modification.cueId]) {
                        cueScores[modification.cueId].push(modification.score);
                    } else {
                        cueScores[modification.cueId] = [modification.score];
                    }
                }
            });

            let statistics: any[] = [];

            const cues = Object.keys(cueScores);

            for (let i = 0; i < cues.length; i++) {
                let cueId = cues[i];

                const scores = cueScores[cueId];

                const max = ss.max(scores);

                const min = ss.min(scores);

                const mean = ss.mean(scores);

                const median = ss.median(scores);

                const std = ss.standardDeviation(scores);

                const submissionCount = scores.length;

                statistics.push({
                    cueId,
                    max,
                    min,
                    mean: mean.toFixed(1),
                    median: median.toFixed(1),
                    std: std.toFixed(2),
                    submissionCount
                });
            }

            return statistics;
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field(type => [GradeObject], {
        description: 'Returns a list of grade object.'
    })
    public async getGrades(
        @Arg('channelId', type => String)
        channelId: string
    ) {
        try {
            const gradedData: any = await ModificationsModel.find({
                channelId,
                submission: true
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
                        submittedAt: modification.submittedAt
                    });
                } else {
                    userIds.push(modification.userId);
                    gradesObject[modification.userId] = [
                        {
                            score: modification.score,
                            gradeWeight: modification.gradeWeight,
                            cueId: modification.cueId,
                            graded: modification.graded,
                            submittedAt: modification.submittedAt
                        }
                    ];
                }
            });
            const users: any = await UserModel.find({ _id: { $in: userIds } });
            const grades: any[] = [];

            const channel: any = await ChannelModel.findById(channelId);

            let owners: any[] = [];

            if (channel) {
                owners = channel.owners
                    ? [...channel.owners, channel.createdBy.toString()]
                    : [channel.createdBy.toString()];
            }

            // Filter channel owners data out
            const filteredUsers = users.filter((u: any) => {
                const user = u.toObject();
                return !owners.includes(user._id.toString());
            });

            filteredUsers.map((u: any) => {
                const user = u.toObject();
                grades.push({
                    userId: user._id,
                    displayName: user.displayName,
                    fullName: user.fullName,
                    email: user.email && user.email !== '' ? user.email : '',
                    scores: gradesObject[user._id] ? gradesObject[user._id] : []
                });
            });
            return grades;
        } catch (e) {
            return [];
        }
    }

    @Field(type => Boolean, {
        description: 'Returns status of channel meeting.'
    })
    public async getMeetingStatus(
        @Arg('channelId', type => String)
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

    // @Field(type => Boolean, {
    //     description: "Returns true if channel name exists."
    // })
    // public async doesChannelNameExist(
    //     @Arg("name", type => String)
    //     name: string
    // ) {
    //     try {
    //         const channel = await ChannelModel.findOne({ name });
    //         if (channel) {
    //             return true;
    //         } else {
    //             return false;
    //         }
    //     } catch (e) {
    //         return false;
    //     }
    // }

    // @Field(type => [LectureRecording], {
    //     description: "Returns true if channel name exists."
    // })
    // public async getRecordings(
    //     @Arg("channelId", type => String)
    //     channelId: string
    // ) {
    //     try {

    //         const axios = require('axios')
    //         const sha1 = require('sha1');
    //         const vdoURL = 'https://my2.vdo.click/bigbluebutton/api/'
    //         const vdoKey = 'KgX9F6EE0agJzRSU9DVDh5wc2U4OvtGJ0mtJHfh97YU'
    //         let params =
    //             'meetingID=' + channelId
    //         const toHash = (
    //             'getRecordings' + params + vdoKey
    //         )
    //         const checkSum = sha1(toHash)
    //         const url = vdoURL + 'getRecordings?' + params + '&checksum=' + checkSum
    //         const data = await axios.get(url)

    //         const xml2js = require('xml2js');
    //         const parser = new xml2js.Parser();
    //         const json = await parser.parseStringPromise(data.data);
    //         const unparsedRecordings = json.response.recordings[0].recording
    //         if (!unparsedRecordings) {
    //             return []
    //         }
    //         const parsedRecordings: any = []
    //         unparsedRecordings.map((item: any) => {
    //             const startTime = new Date(0)
    //             startTime.setUTCMilliseconds(item.startTime[0])
    //             const endTime = new Date(0)
    //             endTime.setUTCMilliseconds(item.endTime[0])
    //             parsedRecordings.push({
    //                 recordID: item.recordID[0],
    //                 startTime,
    //                 endTime,
    //                 url: item.playback[0].format[0].url[0],
    //                 thumbnail: item.playback[0].format[0].preview[0].images[0].image[0]._
    //             })
    //         })
    //         return parsedRecordings;

    //     } catch (e) {
    //         console.log(e)
    //         return [];
    //     }
    // }

    @Field(type => Boolean, {
        description: 'Returns true if channel can be deleted/is temporary.'
    })
    public async isChannelTemporary(
        @Arg('channelId', type => String)
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

    @Field(type => [MeetingStatusObject], {
        description: 'Fetch any ongoing meetings and returns URLs for them'
    })
    public async ongoingMeetings(
        @Arg('userId', type => String)
        userId: string,
        @Arg('channelId', type => String)
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

                const dates = await DateModel.find({
                    scheduledMeetingForChannelId: channelId,
                    isNonMeetingChannelEvent: { $ne: true },
                    zoomMeetingId: { $ne: undefined },
                    zoomMeetingScheduledBy: { $ne: undefined },
                    start: { $lte: new Date() },
                    end: { $gte: new Date() }
                });

                if (dates.length === 0) {
                    return [];
                } else {
                    let meetings: any[] = [];

                    for (let i = 0; i < dates.length; i++) {
                        const meet = dates[i];

                        let accessToken = '';

                        const zoomMeetingScheduledBy = meet.zoomMeetingScheduledBy;
                        const meetingId = meet.zoomMeetingId;

                        console.log('Zoom meeting scheduled by', zoomMeetingScheduledBy);
                        console.log('Meeting id', meetingId);

                        const u = await UserModel.findOne({
                            _id: zoomMeetingScheduledBy
                        });

                        if (u) {
                            const user = u.toObject();

                            console.log('User', user);

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
                                            'Content-Type': 'application/x-www-form-urlencoded'
                                        }
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
                                            expiresOn: eOn // saved as a date
                                        }
                                    }
                                );
                            } else {
                                accessToken = user.zoomInfo.accessToken;
                            }

                            console.log('Access Token', accessToken);

                            // create meeting
                            const zoomRes: any = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
                                headers: {
                                    Authorization: `Bearer ${accessToken}`
                                }
                            });

                            console.log('Zoom res', zoomRes);

                            if (zoomRes.status !== 200 && zoomRes.status !== 201) {
                                return;
                            }

                            const zoomData: any = zoomRes.data;

                            if (zoomData.id) {
                                // Create a new Date
                                meetings.push({
                                    title: meet.title,
                                    description: meet.description,
                                    startUrl: isOwner ? zoomData.start_url : '',
                                    joinUrl: zoomData.join_url,
                                    error: '',
                                    start: meet.start,
                                    end: meet.end
                                });
                            } else {
                                return;
                            }
                        }
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
}
