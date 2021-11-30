import * as AWS from 'aws-sdk';
import Busboy from 'busboy';
import { GraphQLServer } from 'graphql-yoga';
import { link } from 'fs';
import { basename } from 'path';
import { UserModel } from '@app/data/user/mongo/User.model';
const mime = require('mime-types');
const util = require('util');
import { SubscriptionModel } from '../../data/subscription/mongo/Subscription.model';
import { CueModel } from '../../data/cue/mongo/Cue.model';
import { ChannelModel } from '../../data/channel/mongo/Channel.model';
import { GroupModel } from '../../data/group/mongo/Group.model';
import { MessageModel } from '../../data/message/mongo/Message.model';
import { ThreadModel } from '../../data/thread/mongo/Thread.model';
import { ActivityModel } from '@app/data/activity/mongo/activity.model';
import { ModificationsModel } from '@app/data/modification/mongo/Modification.model';
import { htmlStringParser } from '@helper/HTMLParser';
import request from 'request-promise';
import { DateModel } from '@app/data/dates/mongo/dates.model';
import { AttendanceModel } from '@app/data/attendance/mongo/attendance.model';

/**
 * This is the function used to initializeroutes that is going to let uses upload to the s3 bucket.
 * Either third party pdfs or images for the events
 */
export function initializeRoutes(GQLServer: GraphQLServer) {
    // Joined Zoom meeting
    GQLServer.post('/zoom_participant_joined', async (req: any, res: any) => {
        // console.log(req.body);
        const accountId = req.body.payload.account_id;
        // const channelName = req.body.payload.object.topic;
        const zoomMeetingId = req.body.payload.object.id;

        const currentDate = new Date();

        // Technically two recurring meetings must be atleast 24 hours apart

        const plus60 = new Date(currentDate.getTime() + 1000 * 60 * 60);

        const minus60 = new Date(currentDate.getTime() - 1000 * 60 * 60);

        const activeDate = await DateModel.findOne({
            zoomMeetingId,
            start: { $lte: plus60 },
            end: { $gte: minus60 }
        });
        console.log('Active date', activeDate);

        const u = await UserModel.findOne({ 'zoomInfo.accountId': accountId });
        // const c = await ChannelModel.findOne({ name: channelName });

        if (u && activeDate) {
            const attendanceMarked = await AttendanceModel.findOne({
                dateId: activeDate._id,
                userId: u._id,
                channelId: activeDate.scheduledMeetingForChannelId
            });

            // If attendance object does not exist then create one
            if (!attendanceMarked || !attendanceMarked.joinedAt) {
                const res = await AttendanceModel.create({
                    userId: u._id,
                    dateId: activeDate._id,
                    joinedAt: new Date(),
                    channelId: activeDate.scheduledMeetingForChannelId
                });
                console.log('Attendane marked', res);
            }
        }

        res.json({
            status: 'ok'
        });
    });

    // Left Zoom
    GQLServer.post('/zoom_participant_left', async (req: any, res: any) => {
        // console.log(req.body);
        const accountId = req.body.payload.account_id;

        const zoomMeetingId = req.body.payload.object.id;

        const currentDate = new Date();

        const plus60 = new Date(currentDate.getTime() + 1000 * 60 * 60);

        const minus60 = new Date(currentDate.getTime() - 1000 * 60 * 60);

        const activeDate = await DateModel.findOne({
            zoomMeetingId,
            start: { $lte: plus60 },
            end: { $gte: minus60 }
        });

        console.log('Active date', activeDate);

        const u = await UserModel.findOne({ 'zoomInfo.accountId': accountId });

        if (u && activeDate) {
            const attendanceMarked = await AttendanceModel.findOne({
                dateId: activeDate._id,
                userId: u._id,
                channelId: activeDate.scheduledMeetingForChannelId
            });

            console.log('Existing attendance', attendanceMarked);

            // If attendance object does not exist
            if (!attendanceMarked || !attendanceMarked.joinedAt) {
                await AttendanceModel.create({
                    userId: u._id,
                    dateId: activeDate._id,
                    joinedAt: new Date(),
                    leftAt: new Date(),
                    channelId: activeDate.scheduledMeetingForChannelId
                });
            } else if (attendanceMarked) {
                await AttendanceModel.updateOne(
                    {
                        _id: attendanceMarked._id
                    },
                    {
                        leftAt: new Date()
                    }
                );
            }
        }

        res.json({
            status: 'ok'
        });
    });

    // Deauthorized app Zoom
    GQLServer.post('/zoom_deauth', async (req: any, res: any) => {
        const accountId = req.body.payload.account_id;

        const u = await UserModel.findOne({ 'zoomInfo.accountId': accountId });

        if (u) {
            await UserModel.updateOne(
                {
                    _id: u._id
                },
                {
                    zoomInfo: undefined
                }
            );
        }

        res.json({
            status: 'ok'
        });
    });

    // Zoom user profile updated
    GQLServer.post('/zoom_profile_updated', async (req: any, res: any) => {
        const accountId = req.body.payload.account_id;

        const profile = req.body.payload.object;

        const u = await UserModel.findOne({ 'zoomInfo.accountId': accountId });

        if (u && profile.email) {
            await UserModel.updateOne(
                {
                    _id: u._id
                },
                {
                    $set: { 'zoomInfo.email': profile.email }
                }
            );
        } else if (u && profile.type) {
            await UserModel.updateOne(
                {
                    _id: u._id
                },
                {
                    $set: { 'zoomInfo.accountType': profile.type }
                }
            );
        }

        res.json({
            status: 'ok'
        });
    });

    // ZOOM MEETING DELETED
    GQLServer.post('/zoom_meeting_deleted', async (req: any, res: any) => {
        // const accountId = req.body.payload.account_id;

        const zoomMeetingId = req.body.payload.object.id;

        console.log('Meeting id', zoomMeetingId);

        const dateObjects = await DateModel.find({
            zoomMeetingId
        });

        const dateIds: string[] = dateObjects.map((d: any) => d._id);

        console.log('Update date ids', dateIds);

        await DateModel.updateMany(
            {
                _id: { $in: dateIds }
            },
            {
                $set: {
                    zoomMeetingId: undefined,
                    zoomJoinUrl: undefined,
                    zoomStartUrl: undefined,
                    zoomMeetingScheduledBy: undefined
                }
            }
        );

        res.json({
            status: 'ok'
        });
    });

    /**
     * This is used for uploading images
     */
    GQLServer.post('/api/upload', (req: any, res: any) => {
        // this body field is used for recognizition if attachment is EventImage, Asset or simillar.

        const typeOfUpload = req.body.typeOfUpload;
        const busboy = new Busboy({ headers: req.headers });
        // The file upload has completed
        busboy.on('finish', async () => {
            let file;
            try {
                // Grabs your file object from the request.`
                file = req.files.attachment;
            } catch (e) {
                //
            }
            AWS.config.update({
                accessKeyId: 'AKIAJS2WW55SPDVYG2GQ',
                secretAccessKey: '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'
            });

            const s3 = new AWS.S3();
            // configuring parameters

            let params: any;
            try {
                params = {
                    Bucket: 'cues-files',
                    Body: file.data,
                    Key: 'media/' + typeOfUpload + '/' + Date.now() + '_' + basename(file.name)
                };

                s3.upload(params, (err: any, data: any) => {
                    // handle error
                    if (err) {
                        res.json({
                            status: 'error',
                            url: null
                        });
                    }
                    // success
                    if (data) {
                        res.json({
                            status: 'success',
                            url: data.Location
                        });
                    }
                });
            } catch (e) {
                //
            }
        });
        req.pipe(busboy);
    });

    GQLServer.post('/api/imageUploadEditor', (req: any, res: any) => {
        AWS.config.update({
            accessKeyId: 'AKIAJS2WW55SPDVYG2GQ',
            secretAccessKey: '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'
        });

        const s3 = new AWS.S3();
        // configuring parameters

        const file = req.files.file;

        console.log('request', file);

        let params: any;
        try {
            params = {
                Bucket: 'cues-files',
                Body: file.data,
                Key: 'media/' + file.mimetype + '/' + Date.now() + '_' + basename(file.name)
            };

            s3.upload(params, (err: any, data: any) => {
                // handle error
                if (err) {
                    res.json({
                        // status: "error",
                        url: null
                    });
                }
                // success
                if (data) {
                    res.json({
                        // status: "success",
                        location: data.Location
                    });
                }
            });
        } catch (e) {
            //
        }
    });

    /**
     * This is used for uploading images
     */
    GQLServer.post('/uploadPdfToS3', async (req: any, res: any) => {
        // this body field is used for recognizition if attachment is EventImage, Asset or simillar.

        const { url, title } = req.body;
        try {
            AWS.config.update({
                accessKeyId: 'AKIAJS2WW55SPDVYG2GQ',
                secretAccessKey: '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'
            });

            const options = {
                uri: url,
                encoding: null
            };

            const body = await request(options);

            const s3 = new AWS.S3();

            s3.upload(
                {
                    Bucket: 'cues-files',
                    Key: 'media/' + 'books/' + Date.now() + '_' + encodeURIComponent(title),
                    Body: body
                },
                (err: any, data: any) => {
                    // handle error
                    if (err) {
                        console.log(err);
                        res.send('');
                    }
                    console.log('Data', data);
                    // success
                    res.send(data.Location);
                }
            );
        } catch (e) {
            console.log(e);
            res.send('');
        }
    });

    GQLServer.post('/api/multiupload', (req: any, res: any) => {
        console.log('in api');
        // this body field is used for recognizition if attachment is EventImage, Asset or simillar.
        const typeOfUpload = req.body.typeOfUpload;
        const busboy = new Busboy({ headers: req.headers });

        busboy.on('finish', async () => {
            let file: any = [];
            let type: any = [];
            try {
                // Grabs your file object from the request.`
                for (const property in req.files) {
                    file.push(req.files[property]);
                    type.push(mime.extension(req.files[property].mimetype));
                }
            } catch (e) {
                console.log('in catch block');
            }
            AWS.config.update({
                accessKeyId: 'AKIAJS2WW55SPDVYG2GQ',
                secretAccessKey: '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'
            });

            const s3 = new AWS.S3();
            // configuring parameters
            await uploadFiles(file, type, res);
        });
        req.pipe(busboy);
    });

    GQLServer.post('/search', async (req: any, res: any) => {
        console.log('in api');
        // this body field is used for recognizition if attachment is EventImage, Asset or simillar.
        console.log('request body');
        console.log(req.body);

        const { term, userId } = req.body;

        console.log('User id', userId);
        console.log('Term', term);

        if (term === '' || userId === '') return '';

        try {
            // search through cues - messages - threads - channels
            // return result, type, add. data to lead to the result

            const toReturn: any = {};
            const subscriptions = await SubscriptionModel.find({
                $and: [{ userId }, { keepContent: { $ne: false } }, { unsubscribedAt: { $exists: false } }]
            });
            const channelIds = subscriptions.map((s: any) => {
                const sub = s.toObject();
                return sub.channelId;
            });

            // Channels
            const channels = await ChannelModel.find({ name: new RegExp(term, 'i') });
            toReturn['channels'] = channels;

            // Cues
            const personalCues = await CueModel.find({
                channelId: { $exists: false },
                createdBy: userId,
                cue: new RegExp(term, 'i')
            });
            toReturn['personalCues'] = personalCues;

            console.log('Personal cues', personalCues);

            const channelCues = await CueModel.find({
                channelId: { $in: channelIds },
                cue: new RegExp(term, 'i')
            });
            toReturn['channelCues'] = channelCues;

            console.log('Channel Cues', channelCues);

            // Messages
            const groups = await GroupModel.find({
                users: userId
            });
            const groupIds = groups.map((g: any) => {
                const group = g.toObject();
                return group._id;
            });

            let groupUsersMap: any = {};

            groups.map((g: any) => {
                const group = g.toObject();
                groupUsersMap[group._id.toString()] = group.users;
            });

            const messages = await MessageModel.find({
                message: new RegExp(term, 'i'),
                groupId: { $in: groupIds }
            });

            console.log('Messages', messages);

            const messagesWithUsers = messages.map((mess: any) => {
                const messObj = mess.toObject();

                const users = groupUsersMap[messObj.groupId.toString()];

                if (users) {
                    return {
                        ...messObj,
                        users
                    };
                }

                return {
                    ...messObj,
                    users: []
                };
            });

            toReturn['messages'] = messagesWithUsers;

            // Need to add the users to each message

            // threads
            const threads = await ThreadModel.find({
                channelId: { $in: channelIds },
                message: new RegExp(term)
            });
            toReturn['threads'] = threads;

            // Add createdBy for all the

            console.log('search results', toReturn);

            return res.send(toReturn);

            // return JSON.stringify(toReturn)
        } catch (e) {
            console.log(e);
            return res.send('');
        }
    });

    GQLServer.post('/getUserData', async (req: any, res: any) => {
        const { userId } = req.body;

        // Fetch all user channels and channel roles
        const channels: any[] = [];

        const subscriptions = await SubscriptionModel.find({
            userId
        });

        // loop over all the channel and fetch users role

        for (let i = 0; i < subscriptions.length; i++) {
            const sub = subscriptions[i];

            const channel = await ChannelModel.findById(sub.channelId);

            if (!channel) return;

            // Channel owner
            if (channel.createdBy.toString() === userId) {
                channels.push({
                    channelId: channel._id,
                    name: channel.name,
                    colorCode: channel.colorCode,
                    role: 'Owner'
                });
                // Channel Moderator
            } else if (channel.owners && channel.owners.length > 0 && channel.owners.includes(userId)) {
                channels.push({
                    channelId: channel._id,
                    name: channel.name,
                    colorCode: channel.colorCode,
                    role: 'Editor'
                });
                // viewer only
            } else {
                channels.push({
                    channelId: channel._id,
                    name: channel.name,
                    colorCode: channel.colorCode,
                    role: 'Viewer'
                });
            }
        }

        // subscriptions.map(async (sub: any) => {

        // })

        // Fetch all the Activity

        const activity: any[] = await ActivityModel.find({
            userId
        });

        // Fetch overall scores for
        const overviewData: any[] = [];

        const scoreMap: any = {};
        const totalMap: any = {};
        const totalAssessmentsMap: any = {};
        const gradedAssessmentsMap: any = {};
        const lateAssessmentsMap: any = {};
        const submittedAssessmentsMap: any = {};

        //
        const scores: any[] = [];

        for (let i = 0; i < channels.length; i++) {
            const sub = channels[i];

            if (sub.role === 'Viewer') {
                const mods = await ModificationsModel.find({
                    channelId: sub.channelId,
                    submission: true,
                    userId,
                    graded: true,
                    releaseSubmission: true
                });

                let score = 0;
                let total = 0;
                let totalAssessments = 0;
                let gradedAssessments = 0;
                let lateAssessments = 0;
                let submittedAssesments = 0;

                const assignments = await ModificationsModel.find({
                    channelId: sub.channelId,
                    submission: true,
                    userId
                });

                assignments.map((mod: any) => {
                    const { title } = htmlStringParser(mod.cue);

                    const sub = new Date(mod.submittedAt);
                    const dead = new Date(mod.deadline);

                    const late = sub > dead;

                    scores.push({
                        channelId: mod.channelId,
                        title,
                        submitted: mod.submittedAt !== null && mod.submittedAt !== undefined,
                        graded: mod.graded,
                        score: mod.score,
                        late
                    });
                });

                mods.map((m: any) => {
                    const mod = m.toObject();
                    if (mod.gradeWeight !== undefined && mod.gradeWeight !== null) {
                        score += mod.graded ? (mod.score * mod.gradeWeight) / 100 : 0;
                        total += mod.gradeWeight;
                        totalAssessments += 1;
                        if (mod.graded) {
                            gradedAssessments += 1;
                        }
                        if (mod.submittedAt) {
                            submittedAssesments += 1;
                            if (mod.deadline) {
                                const sub = new Date(mod.submittedAt);
                                const dead = new Date(mod.deadline);
                                if (sub > dead) {
                                    lateAssessments += 1;
                                }
                            }
                        }
                    }
                });

                scoreMap[sub.channelId] = total === 0 ? 0 : ((score / total) * 100).toFixed(2).replace(/\.0+$/, '');
                totalMap[sub.channelId] = total;
                totalAssessmentsMap[sub.channelId] = totalAssessments;
                lateAssessmentsMap[sub.channelId] = lateAssessments;
                gradedAssessmentsMap[sub.channelId] = gradedAssessments;
                submittedAssessmentsMap[sub.channelId] = submittedAssesments;
            }
        }

        Object.keys(scoreMap).map((key: any) => {
            overviewData.push({
                channelId: key,
                score: scoreMap[key],
                total: totalMap[key],
                totalAssessments: totalAssessmentsMap[key],
                lateAssessments: lateAssessmentsMap[key],
                gradedAssessments: gradedAssessmentsMap[key],
                submittedAssessments: submittedAssessmentsMap[key]
            });
        });

        return res.send({
            channels,
            activity,
            overviewData,
            scores
        });
    });
}

const uploadFiles = async (file: any, type: any, res: any) => {
    let links: any = [];
    return new Promise(async function(resolve, reject) {
        let count = 0;
        await file.forEach(async (fileItem: any, i: number) => {
            let params: any;
            params = {
                Bucket: 'cues-files',
                Body: fileItem.data,
                Key: 'media/' + type[i] + '/' + Date.now() + '_' + basename(fileItem.name)
            };
            var result1 = await afterLoop(params, res);
            if (result1) {
                count = count + 1;
                links.push(result1);
                if (count == file.length) {
                    console.log('creating resp', links);
                    res.json({
                        status: 'success',
                        url: links
                    });
                }
                resolve(result1);
            }
        });
    });
};
const afterLoop = async (params: any, res: any) => {
    return new Promise(function(resolve, reject) {
        AWS.config.update({
            accessKeyId: 'AKIAJS2WW55SPDVYG2GQ',
            secretAccessKey: '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'
        });
        const s3 = new AWS.S3();
        s3.upload(params, async (err: any, data: any) => {
            // handle error
            if (err) {
                reject(err);
                res.json({
                    status: 'error',
                    url: null
                });
            }
            // success
            if (data) {
                resolve(data.Location);
            }
        });
    });
};
