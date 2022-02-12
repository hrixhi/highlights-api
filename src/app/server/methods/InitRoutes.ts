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
import WorkOS from '@workos-inc/node';
import { WORKOS_API_KEY, WORKOS_WEBHOOK_KEY } from '@helper/workosCredentials';
import { SchoolsModel } from '@app/data/school/mongo/School.model';
import { EmailService } from '../../../emailservice/Postmark';
const FormData = require('form-data')
const fs = require('fs')
import axios from 'axios'
import { PassThrough } from 'stream';

const PSPDFKIT_API_KEY = 'pdf_live_pixgIxf3rrhpCL1z6QqEhWzU2q2fSPmrwA7bHv6hp5r';

/**
 * This is the function used to initializeroutes that is going to let uses upload to the s3 bucket.
 * Either third party pdfs or images for the events
 */
export function initializeRoutes(GQLServer: GraphQLServer) {
    // Check for SSO
    GQLServer.post('/checkSSO', async (req: any, res: any) => {
        const { ssoDomain } = req.body;

        const foundSSO = await SchoolsModel.findOne({
            ssoDomain,
            ssoEnabled: true,
            workosConnection: { $ne: undefined }
        });

        if (foundSSO && foundSSO.workosConnection && foundSSO.workosConnection.state === 'active') {
            return res.json({
                ssoFound: true
            });
        }

        return res.json({
            ssoFound: false
        });
    });

    // Landing page queries
    GQLServer.post('/contactSales', async (req: any, res: any) => {
        const {
            name,
            email,
            orgName = '',
            numOfInstructors = '',
            numOfStudents = '',
            country = '',
            learningModel = ''
        } = req.body;

        if (!name || !email) {
            res.status(400).send({ error: 'Name and Email are required.' });
        }

        const emailService = new EmailService();
        emailService.contactSales(name, email, orgName, numOfInstructors, numOfStudents, country, learningModel);

        return res.status(200).send('Successful!');
    });

    // Joined Zoom meeting
    GQLServer.post('/zoom_participant_joined', async (req: any, res: any) => {
        // console.log('Req', req.headers.authorization);
        console.log('Participant joined', req.body);

        if (!req || !req.headers || req.headers.authorization !== 'H-M9N9PcSq2fkx2nZWYcrQ') {
            res.json(400, {
                error: 1,
                msg: 'Invalid verification token.'
            });
        }

        const accountId = req.body.payload.account_id;
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
        console.log('User found', u);

        if (u && activeDate) {
            const dateObject = activeDate.toObject();

            console.log('scheduledMeetingForChannelId', dateObject.scheduledMeetingForChannelId);

            const attendanceMarked = await AttendanceModel.findOne({
                dateId: dateObject._id,
                userId: u._id,
                channelId: dateObject.scheduledMeetingForChannelId
            });

            // If attendance object does not exist then create one
            if (!attendanceMarked || !attendanceMarked.joinedAt) {
                const res = await AttendanceModel.create({
                    userId: u._id,
                    dateId: dateObject._id,
                    joinedAt: new Date(),
                    channelId: dateObject.scheduledMeetingForChannelId
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
        // console.log('Req', req.headers.authorization);

        if (!req || !req.headers || req.headers.authorization !== 'H-M9N9PcSq2fkx2nZWYcrQ') {
            res.json(400, {
                error: 1,
                msg: 'Invalid verification token.'
            });
        }

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
            const dateObject = activeDate.toObject();

            const attendanceMarked = await AttendanceModel.findOne({
                dateId: dateObject._id,
                userId: u._id,
                channelId: dateObject.scheduledMeetingForChannelId
            });

            console.log('Existing attendance', attendanceMarked);

            // If attendance object does not exist
            if (!attendanceMarked || !attendanceMarked.joinedAt) {
                await AttendanceModel.create({
                    userId: u._id,
                    dateId: dateObject._id,
                    joinedAt: new Date(),
                    leftAt: new Date(),
                    channelId: dateObject.scheduledMeetingForChannelId
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
        console.log('Req', req.headers.authorization);

        if (!req || !req.headers || req.headers.authorization !== 'H-M9N9PcSq2fkx2nZWYcrQ') {
            res.json(400, {
                error: 1,
                msg: 'Invalid verification token.'
            });
        }

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
        console.log('Req', req.headers.authorization);

        if (!req || !req.headers || req.headers.authorization !== 'H-M9N9PcSq2fkx2nZWYcrQ') {
            res.json(400, {
                error: 1,
                msg: 'Invalid verification token.'
            });
        }

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

        console.log('Req', req.headers.authorization);

        if (!req || !req.headers || req.headers.authorization !== 'H-M9N9PcSq2fkx2nZWYcrQ') {
            res.json(400, {
                error: 1,
                msg: 'Invalid verification token.'
            });
        }

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

    // WORK OS CONNECTION WEBHOOK

    GQLServer.post('/workos', async (req: any, res: any) => {
        const payload = req.body;
        const sigHeader = req.headers['workos-signature'];

        const workos = new WorkOS(WORKOS_API_KEY);

        const webhook = workos.webhooks.constructEvent({ payload, sigHeader, secret: WORKOS_WEBHOOK_KEY });

        console.log('Webhook', webhook);

        if (webhook.event === 'connection.activated' && webhook.id !== '') {
            const { data } = webhook;

            const { id, connection_type, state, name, organization_id } = data;

            SchoolsModel.updateOne(
                {
                    workosOrgId: organization_id
                },
                {
                    workosConnection: {
                        id,
                        connection_type,
                        name,
                        state
                    }
                }
            ).then(res => console.log(res));

            // console.log('Update', update);
        } else if (webhook.event === 'connection.deactivated' && webhook.id !== '') {
            const { data } = webhook;

            const { state, organization_id } = data;

            SchoolsModel.updateOne(
                {
                    workosOrgId: organization_id
                },
                {
                    $set: { 'workosConnection.status': state }
                }
            ).then(res => console.log(res));

            // console.log('Update', update);
        } else if (webhook.event === 'connection.deleted' && webhook.id !== '') {
            const { data } = webhook;

            const { organization_id } = data;

            SchoolsModel.updateOne(
                {
                    workosOrgId: organization_id
                },
                {
                    workosConnection: null
                }
            ).then(res => console.log(res));

            // console.log('Update', update);
        }
        res.status(200).json({
            status: 'ok'
        });
    });

    /**
     * This is used for uploading images
     */
    GQLServer.post('/api/upload', (req: any, res: any) => {
        // this body field is used for recognizition if attachment is EventImage, Asset or simillar.

        const { userId = '' } = req.body;

        let filePath = userId !== '' ? 'media/' + userId + '/' : 'media/all/';

        const typeOfUpload = req.body.typeOfUpload;
        const busboy = new Busboy({ headers: req.headers });

       

        // The file upload has completed
        busboy.on('finish', async () => {
            let file;
            let body;
            let s3FileName;
            let s3TypeOfUpload;

            try {
                // Grabs your file object from the request.`
                file = req.files.attachment;
            } catch (e) {
                res.json({
                    status: 'error',
                    url: null
                });
            }

            if (typeOfUpload === 'ppt' || typeOfUpload === 'pptx' || typeOfUpload === 'doc' || typeOfUpload === 'docx' || typeOfUpload === 'xlsx' || typeOfUpload === 'xls') {
                
                s3FileName = basename(file.name).split('.')[0] + '.pdf';
                s3TypeOfUpload = 'pdf';
                
                // Need to convert to PDF by using PSPDFKIT
                const formData = new FormData()

                formData.append('instructions', JSON.stringify({
                    parts: [
                      {
                        file: "document"
                      }
                    ]
                }))

                formData.append('document', Buffer.from(file.data, 'base64'))
                // formData.append('document', fs.createReadStream('document.docx'))

                try {
                    const response = await axios.post('https://api.pspdfkit.com/build', formData, {
                        headers: formData.getHeaders({
                            'Authorization': `Bearer ${PSPDFKIT_API_KEY}`
                        }),
                        responseType: "stream"
                    })
                
                    const passThrough = new PassThrough()
                    response.data.pipe(passThrough)
                    // body = await stream2buffer(response.data)
                    body = passThrough


                } catch (e) {
                    const errorString = await streamToString(e.response.data)
                    console.log(errorString)
                }

            } else {
                body = file.data;
                s3FileName = basename(file.name);
                s3TypeOfUpload = typeOfUpload;
            }

            console.log("Body", body)
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
                    Body: body,
                    Key: filePath + s3TypeOfUpload + '/' + Date.now() + '_' + s3FileName
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
                console.log('error', e);
            }
        });
        req.pipe(busboy);
    });

    function streamToString(stream: any) {
        const chunks: any[] = []
        return new Promise((resolve, reject) => {
          stream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)))
          stream.on("error", (err: any) => reject(err))
          stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
        })
    }

    async function stream2buffer(stream: any): Promise<Buffer> {

        return new Promise < Buffer > ((resolve, reject) => {
            
            const _buf = Array < any > ();
    
            stream.on("data", (chunk: any) => _buf.push(chunk));
            stream.on("end", () => resolve(Buffer.concat(_buf)));
            stream.on("error", (err: any) => reject(`error converting stream - ${err}`));
    
        });
    } 

    GQLServer.post('/api/imageUploadEditor', (req: any, res: any) => {
        // console.log('Req', req.files);

        const { userId } = req.body;
        // return res.status(400);
        const { file } = req.files;

        AWS.config.update({
            accessKeyId: 'AKIAJS2WW55SPDVYG2GQ',
            secretAccessKey: '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'
        });

        const s3 = new AWS.S3();
        // configuring parameters

        let filePath = userId !== '' ? 'media/' + userId + '/' : 'media/all/';

        let params: any;
        try {
            params = {
                Bucket: 'cues-files',
                Body: file.data,
                Key: filePath + file.mimetype + '/' + Date.now() + '_' + basename(file.name)
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
                        link: data.Location
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

            // For channels, must check for schoolID
            const findUser = await UserModel.findById(userId);

            if (!findUser) {
                return null;
            }

            const toReturn: any = {};

            const schoolId = findUser.schoolId ? findUser.schoolId : '';

            // Channels
            const channels = await ChannelModel.find({ name: new RegExp(term, 'i'), schoolId });
            toReturn['channels'] = channels;

            const subscriptions = await SubscriptionModel.find({
                $and: [{ userId }, { keepContent: { $ne: false } }, { unsubscribedAt: { $exists: false } }]
            });
            const channelIds = subscriptions.map((s: any) => {
                const sub = s.toObject();
                return sub.channelId;
            });

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
                message: new RegExp(term, 'i')
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
            userId,
            unsubscribedAt: { $exists: false }
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

        // Fetch overall scores for
        const overviewData: any[] = [];

        const scoreMap: any = {};
        const totalMap: any = {};
        const totalAssessmentsMap: any = {};
        const gradedAssessmentsMap: any = {};
        const lateAssessmentsMap: any = {};
        const submittedAssessmentsMap: any = {};
        const threadCountMap: any = {};
        const totalAttendanceMap: any = {};
        const attendanceCountMap: any = {};

        //
        const scores: any[] = [];

        for (let i = 0; i < channels.length; i++) {
            const sub = channels[i];

            if (sub.role === 'Viewer') {
                const mods = await ModificationsModel.find({
                    channelId: sub.channelId,
                    userId
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
                        score += mod.releaseSubmission
                            ? mod.submittedAt && mod.graded
                                ? (mod.score * mod.gradeWeight) / 100
                                : 0
                            : 0;
                        total += mod.releaseSubmission ? mod.gradeWeight : 0;
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

                // Get discussion count
                const threadCount: any[] = await ThreadModel.find({
                    userId,
                    channelId: sub.channelId
                });

                // Get Attendance
                const totalAttendances: any[] = await DateModel.find({
                    isNonMeetingChannelEvent: { $ne: true },
                    scheduledMeetingForChannelId: sub.channelId,
                    end: { $lte: new Date() }
                });

                let attendance = 0;

                const userAttendances = totalAttendances.map(async (attendance: any) => {
                    const { dateId } = attendance;

                    const present = await AttendanceModel.findOne({
                        dateId
                    });

                    if (present) {
                        attendance += 1;
                    }
                });

                scoreMap[sub.channelId] = total === 0 ? 0 : ((score / total) * 100).toFixed(2).replace(/\.0+$/, '');
                totalMap[sub.channelId] = total;
                totalAssessmentsMap[sub.channelId] = totalAssessments;
                lateAssessmentsMap[sub.channelId] = lateAssessments;
                gradedAssessmentsMap[sub.channelId] = gradedAssessments;
                submittedAssessmentsMap[sub.channelId] = submittedAssesments;
                threadCountMap[sub.channelId] = threadCount.length;
                totalAttendanceMap[sub.channelId] = totalAttendances.length;
                attendanceCountMap[sub.channelId] = attendance;
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
                submittedAssessments: submittedAssessmentsMap[key],
                threadCount: threadCountMap[key],
                totalAttendance: totalAttendanceMap[key],
                attendanceCount: attendanceCountMap[key]
            });
        });

        return res.send({
            channels,
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
