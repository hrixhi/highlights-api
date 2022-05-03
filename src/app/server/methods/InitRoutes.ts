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
const FormData = require('form-data');
const fs = require('fs');
import axios from 'axios';
import { PassThrough } from 'stream';
import { hashPassword } from '@app/data/methods';
import shortid from 'shortid';
import { EmailModel } from '@app/data/emails/mongo/email.model';
import { ZoomRegistrationModel } from '@app/data/zoom-registration/mongo/zoom-registration.model';

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
            workosConnection: { $ne: undefined },
        });

        if (foundSSO && foundSSO.workosConnection && foundSSO.workosConnection.state === 'active') {
            return res.json({
                ssoFound: true,
            });
        }

        return res.json({
            ssoFound: false,
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
            learningModel = '',
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
        console.log('zoom_participant_joined Participant', req.body.payload.object.participant);
        console.log('Req', req.headers.authorization);

        if (!req || !req.headers || req.headers.authorization !== 'H-M9N9PcSq2fkx2nZWYcrQ') {
            res.json(400, {
                error: 1,
                msg: 'Invalid verification token.',
            });
        }

        const registrant_id = req.body.payload.object.participant.registrant_id;

        const zoomMeetingId = req.body.payload.object.id;

        if (!registrant_id || !zoomMeetingId) {
            return;
        }

        const fetchRegistration = await ZoomRegistrationModel.findOne({
            registrant_id,
        });

        if (!fetchRegistration) return;

        const currentDate = new Date();

        // Technically two recurring meetings must be atleast 24 hours apart

        const plus60 = new Date(currentDate.getTime() + 1000 * 60 * 60);

        const minus60 = new Date(currentDate.getTime() - 1000 * 60 * 60);

        const activeDate = await DateModel.findOne({
            zoomMeetingId,
            start: { $lte: plus60 },
            end: { $gte: minus60 },
        });

        console.log('Active date', activeDate);

        const u = await UserModel.findById(fetchRegistration.userId);

        if (u && activeDate) {
            const dateObject = activeDate.toObject();

            const attendanceMarked = await AttendanceModel.findOne({
                dateId: dateObject._id,
                userId: u._id,
                channelId: dateObject.scheduledMeetingForChannelId,
            });

            console.log('Existing Attendance object ', attendanceMarked);

            // If attendance object does not exist then create one
            if (!attendanceMarked || !attendanceMarked.joinedAt) {
                console.log('Mark attendance');

                const res = await AttendanceModel.create({
                    userId: u._id,
                    dateId: dateObject._id,
                    joinedAt: new Date(),
                    channelId: dateObject.scheduledMeetingForChannelId,
                });

                console.log('Attendance marked?', res);
            }
        }

        res.json({
            status: 'ok',
        });
    });

    // Left Zoom
    GQLServer.post('/zoom_participant_left', async (req: any, res: any) => {
        console.log('zoom_participant_left', req.body);
        console.log('zoom_participant_left Participant', req.body.payload.object.participant);

        console.log('Req', req.headers.authorization);

        if (!req || !req.headers || req.headers.authorization !== 'H-M9N9PcSq2fkx2nZWYcrQ') {
            res.json(400, {
                error: 1,
                msg: 'Invalid verification token.',
            });
        }

        const registrant_id = req.body.payload.object.participant.registrant_id;

        const zoomMeetingId = req.body.payload.object.id;

        console.log('Meeting ID', zoomMeetingId);

        if (!registrant_id || !zoomMeetingId) {
            return;
        }

        const fetchRegistration = await ZoomRegistrationModel.findOne({
            registrant_id,
        });

        if (!fetchRegistration) return;

        const currentDate = new Date();

        const plus60 = new Date(currentDate.getTime() + 1000 * 60 * 60);

        const minus60 = new Date(currentDate.getTime() - 1000 * 60 * 60);

        const activeDate = await DateModel.findOne({
            zoomMeetingId,
            start: { $lte: plus60 },
            end: { $gte: minus60 },
        });

        const u = await UserModel.findById(fetchRegistration.userId);

        if (u && activeDate) {
            const dateObject = activeDate.toObject();

            const attendanceMarked = await AttendanceModel.findOne({
                dateId: dateObject._id,
                userId: u._id,
                channelId: dateObject.scheduledMeetingForChannelId,
            });

            // If attendance object does not exist
            if (!attendanceMarked || !attendanceMarked.joinedAt) {
                await AttendanceModel.create({
                    userId: u._id,
                    dateId: dateObject._id,
                    joinedAt: new Date(),
                    leftAt: new Date(),
                    channelId: dateObject.scheduledMeetingForChannelId,
                });
            } else if (attendanceMarked) {
                await AttendanceModel.updateOne(
                    {
                        _id: attendanceMarked._id,
                    },
                    {
                        leftAt: new Date(),
                    }
                );
            }
        }

        res.json({
            status: 'ok',
        });
    });

    // Deauthorized app Zoom
    GQLServer.post('/zoom_deauth', async (req: any, res: any) => {
        if (!req || !req.headers || req.headers.authorization !== 'H-M9N9PcSq2fkx2nZWYcrQ') {
            res.json(400, {
                error: 1,
                msg: 'Invalid verification token.',
            });
        }

        const accountId = req.body.payload.account_id;

        const u = await UserModel.findOne({ 'zoomInfo.accountId': accountId });

        if (u) {
            await UserModel.updateOne(
                {
                    _id: u._id,
                },
                {
                    zoomInfo: undefined,
                }
            );
        }

        res.json({
            status: 'ok',
        });
    });

    // Zoom user profile updated
    GQLServer.post('/zoom_profile_updated', async (req: any, res: any) => {
        if (!req || !req.headers || req.headers.authorization !== 'H-M9N9PcSq2fkx2nZWYcrQ') {
            res.json(400, {
                error: 1,
                msg: 'Invalid verification token.',
            });
        }

        const accountId = req.body.payload.account_id;

        const profile = req.body.payload.object;

        const u = await UserModel.findOne({ 'zoomInfo.accountId': accountId });

        if (u && profile.email) {
            await UserModel.updateOne(
                {
                    _id: u._id,
                },
                {
                    $set: { 'zoomInfo.email': profile.email },
                }
            );
        } else if (u && profile.type) {
            await UserModel.updateOne(
                {
                    _id: u._id,
                },
                {
                    $set: { 'zoomInfo.accountType': profile.type },
                }
            );
        }

        res.json({
            status: 'ok',
        });
    });

    // ZOOM MEETING DELETED
    GQLServer.post('/zoom_meeting_deleted', async (req: any, res: any) => {
        // const accountId = req.body.payload.account_id;

        if (!req || !req.headers || req.headers.authorization !== 'H-M9N9PcSq2fkx2nZWYcrQ') {
            res.json(400, {
                error: 1,
                msg: 'Invalid verification token.',
            });
        }

        const zoomMeetingId = req.body.payload.object.id;

        const dateObjects = await DateModel.find({
            zoomMeetingId,
        });

        const dateIds: string[] = dateObjects.map((d: any) => d._id);

        await DateModel.updateMany(
            {
                _id: { $in: dateIds },
            },
            {
                $set: {
                    zoomMeetingId: undefined,
                    zoomJoinUrl: undefined,
                    zoomStartUrl: undefined,
                    zoomMeetingScheduledBy: undefined,
                },
            }
        );

        res.json({
            status: 'ok',
        });
    });

    // WORK OS CONNECTION WEBHOOK

    GQLServer.post('/workos', async (req: any, res: any) => {
        const payload = req.body;
        const sigHeader = req.headers['workos-signature'];

        const workos = new WorkOS(WORKOS_API_KEY);

        const webhook = workos.webhooks.constructEvent({ payload, sigHeader, secret: WORKOS_WEBHOOK_KEY });

        if (webhook.event === 'connection.activated' && webhook.id !== '') {
            const { data } = webhook;

            const { id, connection_type, state, name, organization_id } = data;

            SchoolsModel.updateOne(
                {
                    workosOrgId: organization_id,
                },
                {
                    workosConnection: {
                        id,
                        connection_type,
                        name,
                        state,
                    },
                }
            ).then((res) => console.log(res));
        } else if (webhook.event === 'connection.deactivated' && webhook.id !== '') {
            const { data } = webhook;

            const { state, organization_id } = data;

            SchoolsModel.updateOne(
                {
                    workosOrgId: organization_id,
                },
                {
                    $set: { 'workosConnection.status': state },
                }
            ).then((res) => console.log(res));
        } else if (webhook.event === 'connection.deleted' && webhook.id !== '') {
            const { data } = webhook;

            const { organization_id } = data;

            SchoolsModel.updateOne(
                {
                    workosOrgId: organization_id,
                },
                {
                    workosConnection: null,
                }
            ).then((res) => console.log(res));
        }
        res.status(200).json({
            status: 'ok',
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
                    url: null,
                });
            }

            if (
                typeOfUpload === 'ppt' ||
                typeOfUpload === 'pptx' ||
                typeOfUpload === 'doc' ||
                typeOfUpload === 'docx' ||
                typeOfUpload === 'xlsx' ||
                typeOfUpload === 'xls'
            ) {
                s3FileName = basename(file.name).split('.')[0] + '.pdf';
                s3TypeOfUpload = 'pdf';

                // Need to convert to PDF by using PSPDFKIT
                const formData = new FormData();

                formData.append(
                    'instructions',
                    JSON.stringify({
                        parts: [
                            {
                                file: 'document',
                            },
                        ],
                    })
                );

                formData.append('document', Buffer.from(file.data, 'base64'));
                // formData.append('document', fs.createReadStream('document.docx'))

                try {
                    const response = await axios.post('https://api.pspdfkit.com/build', formData, {
                        headers: formData.getHeaders({
                            Authorization: `Bearer ${PSPDFKIT_API_KEY}`,
                        }),
                        responseType: 'stream',
                    });

                    const passThrough = new PassThrough();
                    response.data.pipe(passThrough);
                    // body = await stream2buffer(response.data)
                    body = passThrough;
                } catch (e) {
                    const errorString = await streamToString(e.response.data);
                    console.log(errorString);
                }
            } else {
                body = file.data;
                s3FileName = basename(file.name);
                s3TypeOfUpload = typeOfUpload;
            }

            AWS.config.update({
                accessKeyId: 'AKIAJS2WW55SPDVYG2GQ',
                secretAccessKey: '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',
            });

            const s3 = new AWS.S3();
            // configuring parameters

            let params: any;
            try {
                params = {
                    Bucket: 'cues-files',
                    Body: body,
                    Key: filePath + s3TypeOfUpload + '/' + Date.now() + '_' + s3FileName,
                };

                s3.upload(params, (err: any, data: any) => {
                    // handle error
                    if (err) {
                        res.json({
                            status: 'error',
                            url: null,
                        });
                    }
                    // success
                    if (data) {
                        res.json({
                            status: 'success',
                            url: data.Location,
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

    // Deauthorized app Zoom
    GQLServer.post('/subscribeEmail', async (req: any, res: any) => {
        const emailId = req.body.emailId;

        if (!emailId) {
            return res.status(400).send({ error: 'NO_EMAIL_PROVIDED' });
        }

        const fetchEmail = await EmailModel.findOne({
            emailId,
        });

        if (fetchEmail && fetchEmail._id) {
            if (fetchEmail.unsubscribedAt) {
                // Resubscribe user
                const updateEmail = await EmailModel.updateOne(
                    {
                        _id: fetchEmail._id,
                    },
                    {
                        unsubscribedAt: undefined,
                    }
                );

                res.json({
                    status: 'ok',
                });
            } else {
                // Already subscribed
                return res.status(400).send({ error: 'EMAIL_ALREADY_ADDED' });
            }
        } else {
            const createEmail = await EmailModel.create({
                emailId,
            });

            return res.json({
                status: 'ok',
            });
        }
    });

    // Deauthorized app Zoom
    GQLServer.post('/unsubscribeEmail', async (req: any, res: any) => {
        const emailId = req.body.emailId;

        if (!emailId) {
            return res.status(400).send({ error: 'NO_EMAIL_PROVIDED' });
        }

        // Fetch subscribed user
        const fetchEmail = await EmailModel.findOne({
            emailId,
            unsubscribedAt: { $eq: undefined },
        });

        if (fetchEmail && fetchEmail._id) {
            // Resubscribe user
            const updateEmail = await EmailModel.updateOne(
                {
                    _id: fetchEmail._id,
                },
                {
                    unsubscribedAt: new Date(),
                }
            );

            res.json({
                status: 'ok',
            });
        } else {
            return res.status(400).send({ error: 'EMAIL_ALREADY_UNSUBSCRIBED' });
        }
    });

    function streamToString(stream: any) {
        const chunks: any[] = [];
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
            stream.on('error', (err: any) => reject(err));
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
    }

    async function stream2buffer(stream: any): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            const _buf = Array<any>();

            stream.on('data', (chunk: any) => _buf.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(_buf)));
            stream.on('error', (err: any) => reject(`error converting stream - ${err}`));
        });
    }

    GQLServer.post('/api/imageUploadEditor', (req: any, res: any) => {
        const { userId } = req.body;
        // return res.status(400);
        const { file } = req.files;

        AWS.config.update({
            accessKeyId: 'AKIAJS2WW55SPDVYG2GQ',
            secretAccessKey: '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',
        });

        const s3 = new AWS.S3();
        // configuring parameters

        let filePath = userId !== '' ? 'media/' + userId + '/' : 'media/all/';

        let params: any;
        try {
            params = {
                Bucket: 'cues-files',
                Body: file.data,
                Key: filePath + file.mimetype + '/' + Date.now() + '_' + basename(file.name),
            };

            s3.upload(params, (err: any, data: any) => {
                // handle error
                if (err) {
                    res.json({
                        // status: "error",
                        url: null,
                    });
                }
                // success
                if (data) {
                    res.json({
                        // status: "success",
                        link: data.Location,
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
                secretAccessKey: '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',
            });

            const options = {
                uri: url,
                encoding: null,
            };

            const body = await request(options);

            const s3 = new AWS.S3();

            s3.upload(
                {
                    Bucket: 'cues-files',
                    Key: 'media/' + 'books/' + Date.now() + '_' + encodeURIComponent(title),
                    Body: body,
                },
                (err: any, data: any) => {
                    // handle error
                    if (err) {
                        console.log(err);
                        res.send('');
                    }
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
                secretAccessKey: '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',
            });

            const s3 = new AWS.S3();
            // configuring parameters
            await uploadFiles(file, type, res);
        });
        req.pipe(busboy);
    });

    GQLServer.post('/search', async (req: any, res: any) => {
        const { term, userId } = req.body;

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
            const channels = await ChannelModel.find({
                name: new RegExp(term, 'i'),
                schoolId,
                creatorUnsubscribed: { $ne: true },
                deletedAt: { $exists: false },
            });
            toReturn['channels'] = channels;

            const subscriptions = await SubscriptionModel.find({
                $and: [{ userId }, { keepContent: { $ne: false } }, { unsubscribedAt: { $exists: false } }],
            });
            const channelIds = subscriptions.map((s: any) => {
                const sub = s.toObject();
                return sub.channelId;
            });

            // Cues
            const personalCues = await CueModel.find({
                channelId: { $exists: false },
                createdBy: userId,
                cue: new RegExp(term, 'i'),
            });
            toReturn['personalCues'] = personalCues;

            const channelCues = await CueModel.find({
                channelId: { $in: channelIds },
                cue: new RegExp(term, 'i'),
            });
            toReturn['channelCues'] = channelCues;

            // Messages
            const groups = await GroupModel.find({
                users: userId,
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
                groupId: { $in: groupIds },
            }).populate({
                path: 'groupId',
                model: 'groups',
                select: ['name', 'users', 'image'],
                populate: {
                    path: 'users',
                    model: 'users',
                    select: ['_id', 'fullName', 'avatar'],
                },
            });

            console.log('Messages', messages);

            const messagesWithUsers = messages.map((mess: any) => {
                const messObj = mess.toObject();

                const users = groupUsersMap[messObj.groupId.toString()];

                if (users) {
                    return {
                        ...messObj,
                        users,
                    };
                }

                return {
                    ...messObj,
                    users: [],
                };
            });

            console.log('Message with users', messagesWithUsers);

            toReturn['messages'] = messagesWithUsers;

            // Need to add the users to each message

            // threads
            const threads = await ThreadModel.find({
                channelId: { $in: channelIds },
                $or: [{ message: new RegExp(term, 'i') }, { title: new RegExp(term, 'i') }],
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
            unsubscribedAt: { $exists: false },
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
                    role: 'Owner',
                });
                // Channel Moderator
            } else if (channel.owners && channel.owners.length > 0 && channel.owners.includes(userId)) {
                channels.push({
                    channelId: channel._id,
                    name: channel.name,
                    colorCode: channel.colorCode,
                    role: 'Editor',
                });
                // viewer only
            } else {
                channels.push({
                    channelId: channel._id,
                    name: channel.name,
                    colorCode: channel.colorCode,
                    role: 'Viewer',
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
                    userId,
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
                    userId,
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
                        late,
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
                    channelId: sub.channelId,
                });

                // Get Attendance
                const totalAttendances: any[] = await DateModel.find({
                    isNonMeetingChannelEvent: { $ne: true },
                    scheduledMeetingForChannelId: sub.channelId,
                    end: { $lte: new Date() },
                });

                let attendance = 0;

                const userAttendances = totalAttendances.map(async (attendance: any) => {
                    const { dateId } = attendance;

                    const present = await AttendanceModel.findOne({
                        dateId,
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
                attendanceCount: attendanceCountMap[key],
            });
        });

        return res.send({
            channels,
            overviewData,
            scores,
        });
    });

    // ONBOARDING
    GQLServer.post('/onboard_course', async (req: any, res: any) => {
        const { name, email, password, organizationName, country, courseName, studentEmails } = req.body;

        console.log('Inputs', { name, email, password, organizationName, country, courseName, studentEmails });

        // Validation
        if (
            !email ||
            email.trim() === '' ||
            !password ||
            password.trim() === '' ||
            !courseName ||
            courseName.trim() === '' ||
            !studentEmails ||
            studentEmails.length === 0
        ) {
            return res.status(400).send({ error: 'One of the required fields not provided.' });
        }

        // Validation for Course name
        if (
            courseName.toString().trim() === 'All' ||
            courseName.toString().trim() === 'All-Channels' ||
            courseName
                .toString()
                .trim()
                .toLowerCase() === 'home' ||
            courseName
                .toString()
                .trim()
                .toLowerCase() === 'cues' ||
            courseName
                .toString()
                .trim()
                .toLowerCase() === 'my notes'
        ) {
            return res.status(400).send({ error: 'Cannot use this course name. Try using a different one.' });
        }

        // Step 1: Create instructor account
        const existingInstructor = await UserModel.findOne({
            email,
        });

        let instructor: any = {};

        if (existingInstructor && existingInstructor._id) {
            // Edge case
            if (existingInstructor.schoolId && existingInstructor.schoolId.toString() !== '') {
                return res.status(400).send({ error: 'An account with this email already exists.' });
            }

            instructor = existingInstructor;
        } else {
            // Create new instructor

            // Hash the password
            const hash = await hashPassword(password);

            instructor = await UserModel.create({
                email,
                fullName: name,
                displayName: name.toLowerCase(),
                notificationId: 'NOT_SET',
                password: hash,
                role: 'instructor',
            });
        }

        if (!instructor || !instructor._id) {
            return res.status(400).send({ error: 'Something went wrong. Try again.' });
        }

        console.log('Instructor', instructor);

        // Step 2: Create the organization
        const hash = await hashPassword(password);

        let org: any = {};

        const existingOrg = await SchoolsModel.findOne({
            createdByUser: instructor._id,
        });

        if (existingOrg && existingOrg._id) {
            org = existingOrg;
        } else {
            const encodeOrgName = name
                .split(' ')
                .join('_')
                .toLowerCase();

            org = await SchoolsModel.create({
                name,
                password: hash,
                cuesDomain: encodeOrgName + '.learnwithcues.com',
                createdByUser: instructor._id,
            });
        }

        if (!org || !org._id) {
            return res.status(400).send({ error: 'Something went wrong. Try again.' });
        }

        console.log('Org', org);

        // Update user
        await UserModel.updateOne(
            {
                _id: instructor._id,
            },
            {
                schoolId: org._id,
            }
        );

        const colorChoices = [
            '#f44336',
            '#e91e63',
            '#9c27b0',
            '#673ab7',
            '#3f51b5',
            '#2196f3',
            '#03a9f4',
            '#00bcd4',
            '#009688',
            '#4caf50',
            '#8bc34a',
            '#cddc39',
            '#ff5722',
            '#795548',
        ];

        const randomColor = colorChoices[Math.floor(Math.random() * colorChoices.length)];

        // Step 3: Create the course
        const createCourse = await ChannelModel.create({
            name: courseName.toString().trim(),
            createdBy: instructor._id,
            temporary: true,
            accessCode: shortid.generate(),
            colorCode: randomColor,
            owners: [],
            schoolId: org._id,
        });

        if (!createCourse || !createCourse._id) {
            return res.status(400).send({ error: 'Something went wrong. Try again.' });
        }

        // Subscribe instructor to the course
        const sub = await SubscriptionModel.create({
            userId: instructor._id,
            channelId: createCourse._id,
        });

        console.log('Course', createCourse);

        let failed = [];
        let success = [];

        const addedStudentActivities: any[] = [];
        let addedPasswords: any = {};

        const emailSet = new Set<string>(studentEmails);

        // Step 4: Create student accounts
        for (const studentEmail of emailSet) {
            // Create account for student
            let student: any = {};

            const email = studentEmail.toLowerCase().trim();

            const existingStudent = await UserModel.findOne({
                email,
            });

            if (existingStudent && existingStudent._id) {
                // Existing user found but part of different org
                if (existingStudent.schoolId?.toString() !== org._id.toString()) {
                    failed.push(email);
                    continue;
                } else {
                    student = existingStudent;

                    UserModel.updateOne(
                        {
                            _id: student._id,
                        },
                        {
                            schoolId: org._id,
                        }
                    );
                }
            } else {
                let name = studentEmail
                    .toLowerCase()
                    .trim()
                    .split('@')[0];

                // Generate a password and hash it
                const password = name + '@' + getRandomInt(99999).toString();

                const hash = await hashPassword(password);

                student = await UserModel.create({
                    email,
                    fullName: name,
                    displayName: name,
                    notificationId: 'NOT_SET',
                    password: hash,
                    schoolId: org._id,
                    role: 'student',
                });

                if (!student || !student._id) {
                    failed.push(email);
                    continue;
                }

                addedPasswords[email] = password;
            }

            // Subscribe the student to the course
            const sub = await SubscriptionModel.create({
                userId: student._id,
                channelId: createCourse._id,
            });

            console.log('New Sub', sub);

            if (sub && sub._id) {
                addedStudentActivities.push({
                    userId: student._id,
                    subtitle: 'You have been added to the course.',
                    title: 'Subscribed',
                    status: 'unread',
                    date: new Date(),
                    channelId: createCourse._id,
                    target: 'CHANNEL_SUBSCRIBED',
                });

                success.push(email);
            } else {
                failed.push(email);
            }
        }

        console.log('Success', success);

        console.log('Failed', failed);

        const subscribeActivites = ActivityModel.insertMany(addedStudentActivities);

        // Send out email invites to both instructors and students

        const emailService = new EmailService();

        console.log('Email Instructor', {
            name: instructor.fullName,
            email: instructor.email,
            course_name: createCourse.name,
        });

        emailService.sendWelcomeEmailInstructor(instructor.fullName, instructor.email, createCourse.name);

        for (const student_email of Object.keys(addedPasswords)) {
            const name = student_email.split('@')[0];

            const student_password = addedPasswords[student_email];

            console.log('Email Student', {
                name,
                student_email,
                course_name: createCourse.name,
                password: student_password,
                instructor_name: instructor.fullName,
            });

            emailService.sendWelcomeEmailStudent(
                name,
                student_email,
                createCourse.name,
                student_password,
                instructor.fullName
            );
        }

        emailService.newOnboardAlert(
            instructor.fullName,
            instructor.email,
            createCourse.name,
            success.length,
            organizationName,
            country
        );

        res.status(200).json({
            success,
            failed,
            redirectUri:
                'https://app.learnwithcues.com/login?' +
                'email=' +
                instructor.email +
                '&password=' +
                encodeURIComponent(password),
        });
    });
}

const getRandomInt = (max: number) => {
    return Math.floor(Math.random() * max);
};

const uploadFiles = async (file: any, type: any, res: any) => {
    let links: any = [];
    return new Promise(async function(resolve, reject) {
        let count = 0;
        await file.forEach(async (fileItem: any, i: number) => {
            let params: any;
            params = {
                Bucket: 'cues-files',
                Body: fileItem.data,
                Key: 'media/' + type[i] + '/' + Date.now() + '_' + basename(fileItem.name),
            };
            var result1 = await afterLoop(params, res);
            if (result1) {
                count = count + 1;
                links.push(result1);
                if (count == file.length) {
                    res.json({
                        status: 'success',
                        url: links,
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
            secretAccessKey: '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',
        });
        const s3 = new AWS.S3();
        s3.upload(params, async (err: any, data: any) => {
            // handle error
            if (err) {
                reject(err);
                res.json({
                    status: 'error',
                    url: null,
                });
            }
            // success
            if (data) {
                resolve(data.Location);
            }
        });
    });
};
