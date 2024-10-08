import { Arg, Field, ObjectType } from 'type-graphql';
import { DateModel } from './mongo/dates.model';
import { nanoid } from 'nanoid';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { IUserModel, UserModel } from '../user/mongo/User.model';

import * as OneSignal from 'onesignal-node';
import Expo from 'expo-server-sdk';
import { ActivityModel } from '../activity/mongo/activity.model';
import moment from 'moment-timezone';

import axios from 'axios';
import { EventObject } from './types/Date.type';
import { EventInputAdmin } from './input-types/EventInputAdmin.type';
import { EditEventInputAdmin } from './input-types/EditEventInputAdmin.type';
import { zoomClientId, zoomClientSecret } from '../../../helpers/zoomCredentials';
import { SchoolsModel } from '../school/mongo/School.model';
import { ZoomRegistrationModel } from '../zoom-registration/mongo/zoom-registration.model';

/**
 * Date Mutation Endpoints
 */
@ObjectType()
export class DateMutationResolver {
    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async create(
        @Arg('userId', (type) => String) userId: string,
        @Arg('title', (type) => String) title: string,
        @Arg('start', (type) => String) start: string,
        @Arg('end', (type) => String) end: string,
        @Arg('channelId', (type) => String, { nullable: true }) channelId?: string
    ) {
        try {
            await DateModel.create({
                userId: channelId && channelId !== '' ? undefined : userId,
                title,
                start: new Date(start),
                end: new Date(end),
                isNonMeetingChannelEvent: channelId && channelId !== '' ? true : false,
                scheduledMeetingForChannelId: channelId && channelId !== '' ? channelId : undefined,
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    // Create V1

    @Field((type) => String, {
        description: 'Used when you want create an event in Agenda',
    })
    public async createV1(
        @Arg('userId', (type) => String) userId: string,
        @Arg('title', (type) => String) title: string,
        @Arg('start', (type) => String) start: string,
        @Arg('end', (type) => String) end: string,
        @Arg('channelId', (type) => String, { nullable: true }) channelId?: string,
        @Arg('meeting', (type) => Boolean, { nullable: true }) meeting?: boolean,
        @Arg('description', (type) => String, { nullable: true })
        description?: string,
        @Arg('recordMeeting', (type) => Boolean, { nullable: true })
        recordMeeting?: boolean,
        @Arg('frequency', (type) => String, { nullable: true }) frequency?: string,
        @Arg('repeatTill', (type) => String, { nullable: true }) repeatTill?: string,
        @Arg('repeatDays', (type) => [String], { nullable: true }) repeatDays?: string[]
    ) {
        try {
            // If the zoom account type is a Licensed account then we need to register users to meetings so that attendance can be captured
            const getZoomAccountType = async (zoomAccessToken: string, zoomEmail: string) => {
                const zoomRes: any = await axios.get(`https://api.zoom.us/v2/users/me?userId=${zoomEmail}`, {
                    headers: {
                        Authorization: `Bearer ${zoomAccessToken}`,
                    },
                });

                console.log('Zoom res get user', zoomRes);

                if (zoomRes.status === 200) {
                    console.log('Get User object', zoomRes.data);

                    const zoomData: any = zoomRes.data;

                    if (zoomData.type === 1) {
                        return 'BASIC';
                    } else {
                        return 'LICENSED';
                    }
                }

                return 'ERROR';
            };

            const registerUsersToMeeting = async (
                zoomAccessToken: string,
                channelId: string,
                zoomMeetingId: string
            ) => {
                const subscriptions = await SubscriptionModel.find({
                    channelId,
                    unsubscribedAt: { $exists: false },
                });

                const fetchCourse = await ChannelModel.findById(channelId);

                if (!fetchCourse) return;

                const course = fetchCourse.toObject();

                const owners = course.owners || [];

                const subIds: string[] = [];

                subscriptions.map((subscription: any) => {
                    const sub = subscription.toObject();
                    if (!owners.includes(sub.userId.toString())) {
                        subIds.push(sub.userId.toString());
                    }
                });

                console.log('Subscription IDs', subIds);

                const users = await UserModel.find({ _id: { $in: subIds } });

                users.map(async (user: IUserModel) => {
                    const u = user.toObject();

                    console.log('User', u);

                    console.log(
                        'Register user url',
                        `https://api.zoom.us/v2/meetings/${Number(zoomMeetingId)}/registrants`
                    );

                    try {
                        const zoomRes: any = await axios.post(
                            `https://api.zoom.us/v2/meetings/${Number(zoomMeetingId)}/registrants`,
                            {
                                first_name: u.fullName,
                                last_name: 'Cues',
                                email: u.email,
                                auto_approve: true,
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${zoomAccessToken}`,
                                },
                            }
                        );

                        console.log('Zoom res register user', zoomRes);

                        if (zoomRes.status === 201) {
                            const zoomData: any = zoomRes.data;

                            console.log('Register user object', zoomRes.data);

                            const zoomRegistration = await ZoomRegistrationModel.create({
                                userId: u._id,
                                channelId,
                                zoomMeetingId,
                                zoom_join_url: zoomData.join_url,
                                registrant_id: zoomData.registrant_id,
                                zoomRegistrationId: zoomData.id.toString(),
                            });
                        }
                    } catch (e) {
                        console.log('Error with registering', e);
                    }
                });
            };

            // isNonMeetingChannelEvent is set to undefined to differentiate meetings from events

            const fetchUser = await UserModel.findById(userId);

            let useZoom = false;

            if (!fetchUser) {
                return 'INVALID_USER';
            }

            // Check the meeting provider if it is a meeting
            if (fetchUser.schoolId && meeting) {
                const org = await SchoolsModel.findById(fetchUser.schoolId);

                if (org && org.meetingProvider && org.meetingProvider !== '') {
                    useZoom = false;
                } else {
                    useZoom = true;
                }
            }

            let recurringId = nanoid();

            let newObj = null;

            const diff = Math.abs(new Date(start).getTime() - new Date(end).getTime());

            const duration = Math.round(diff / 60000);

            if (repeatTill && frequency && frequency !== '1-W') {
                // Construct dates for creating and set a recurring Id
                const dates = this.getAllDates(start, frequency, repeatTill);

                // const recurringId = nanoid();

                for (let i = 0; i < dates.length; i++) {
                    const scheduledDate = dates[i];

                    const startDate = new Date(start);

                    const endDate = new Date(end);

                    // Update start and end date to Scheduled Date
                    // startDate.setDate(scheduledDate.getDate());
                    startDate.setMonth(scheduledDate.getMonth(), scheduledDate.getDate());

                    // endDate.setDate(scheduledDate.getDate());
                    endDate.setMonth(scheduledDate.getMonth(), scheduledDate.getDate());

                    await DateModel.create({
                        userId: channelId && channelId !== '' ? undefined : userId,
                        title,
                        start: startDate,
                        end: endDate,
                        isNonMeetingChannelEvent: !meeting ? (channelId && channelId !== '' ? true : false) : undefined,
                        scheduledMeetingForChannelId: channelId && channelId !== '' ? channelId : undefined,
                        description,
                        recordMeeting,
                        recurringId,
                    });
                }
            } else if (repeatTill && frequency && frequency === '1-W' && repeatDays) {
                const startDate = new Date(start);

                const startDay = startDate.getDay() + 1;

                let allDates: any[] = [];

                // Build a map of all start days for RepeatDays
                for (let i = 0; i < repeatDays.length; i++) {
                    let key = repeatDays[i];
                    let beginDate = '';

                    if (startDay.toString() === key) {
                        beginDate = startDate.toUTCString();
                    } else if (Number(key) > startDay) {
                        const newDate = new Date(start);
                        newDate.setDate(newDate.getDate() + (Number(key) - startDay));
                        beginDate = newDate.toUTCString();
                    } else {
                        const newDate = new Date(start);
                        const diff = 7 - startDay + Number(key);
                        newDate.setDate(newDate.getDate() + diff);
                        beginDate = newDate.toUTCString();
                    }

                    const dates = this.getAllDates(beginDate, frequency, repeatTill);
                    allDates = [...allDates, ...dates];
                }

                for (let i = 0; i < allDates.length; i++) {
                    const scheduledDate = allDates[i];

                    const startDate = new Date(start);

                    const endDate = new Date(end);

                    // Update start and end date to Scheduled Date
                    startDate.setMonth(scheduledDate.getMonth(), scheduledDate.getDate());
                    endDate.setMonth(scheduledDate.getMonth(), scheduledDate.getDate());

                    await DateModel.create({
                        userId: channelId && channelId !== '' ? undefined : userId,
                        title,
                        start: startDate,
                        end: endDate,
                        isNonMeetingChannelEvent: !meeting ? (channelId && channelId !== '' ? true : false) : undefined,
                        scheduledMeetingForChannelId: channelId && channelId !== '' ? channelId : undefined,
                        description,
                        recordMeeting,
                        recurringId,
                    });
                }
            } else {
                newObj = await DateModel.create({
                    userId: channelId && channelId !== '' ? undefined : userId,
                    title,
                    start: new Date(start),
                    end: new Date(end),
                    isNonMeetingChannelEvent: !meeting ? (channelId && channelId !== '' ? true : false) : undefined,
                    scheduledMeetingForChannelId: channelId && channelId !== '' ? channelId : undefined,
                    description,
                    recordMeeting,
                });
            }

            // IF no channel just return

            if (!channelId) return 'SUCCESS';

            if (meeting && useZoom) {
                let accessToken = '';
                const u: any = await UserModel.findById(userId);
                const c: any = await ChannelModel.findById(channelId);
                if (u && c) {
                    const user = u.toObject();
                    const channel = c.toObject();

                    if (!user.zoomInfo) {
                        return 'error';
                    } else {
                        accessToken = user.zoomInfo.accessToken;
                    }

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
                            return 'ZOOM_MEETING_CREATE_FAILED';
                        }

                        const zoomData: any = zoomRes.data;

                        const eOn = new Date();
                        eOn.setSeconds(
                            eOn.getSeconds() +
                                (Number.isNaN(Number(zoomData.expires_in)) ? 0 : Number(zoomData.expires_in))
                        );

                        accessToken = zoomData.access_token;

                        await UserModel.updateOne(
                            { _id: userId },
                            {
                                zoomInfo: {
                                    ...user.zoomInfo,
                                    accessToken: zoomData.access_token,
                                    refreshToken: zoomData.refresh_token,
                                    expiresOn: eOn, // saved as a date
                                },
                            }
                        );
                    }

                    let owner = true;
                    if (channel.owners) {
                        channel.owners.map((uId: any) => {
                            if (uId.toString().trim() === userId.toString().trim()) {
                                owner = true;
                            }
                        });
                    }
                    if (channel.createdBy.toString().trim() === userId.toString().trim()) {
                        owner = true;
                    }

                    if (!owner) {
                        //
                    } else {
                        if (repeatTill && frequency && frequency !== '1-W') {
                            // Recurring but no specific days
                            let type;
                            let repeat_interval;

                            if (frequency === '2-W') {
                                type = 2;
                                repeat_interval = 2;
                            } else if (frequency === '1-M') {
                                type = 3;
                                repeat_interval = 1;
                            } else if (frequency === '2-M') {
                                type = 3;
                                repeat_interval = 2;
                            } else if (frequency === '3-M') {
                                type = 3;
                                repeat_interval = 2;
                            }

                            const utcEndTime = moment(new Date(repeatTill), 'YYYY-MM-DDTHH:mm:ss')
                                .tz('UTC')
                                .format();

                            let recurrence: any = {
                                type,
                                repeat_interval,
                                end_date_time: utcEndTime + 'Z',
                            };

                            if (type === 3) {
                                recurrence.monthly_day = new Date(start).getDate();
                            }

                            // Fetch User First and get account type of the user
                            const accountType = await getZoomAccountType(accessToken, user.zoomInfo.email);

                            if (accountType === 'ERROR') {
                                return 'ZOOM_MEETING_CREATE_FAILED';
                            }

                            // CREATE MEETING
                            const utcTime = moment(new Date(start), 'YYYY-MM-DDTHH:mm:ss')
                                .tz('UTC')
                                .format();

                            const zoomRes: any = await axios.post(
                                `https://api.zoom.us/v2/users/me/meetings`,
                                {
                                    topic: channel.name + '- ' + title,
                                    agenda: description,
                                    type: 8,
                                    start_time: utcTime + 'Z',
                                    duration,
                                    recurrence,
                                    settings: {
                                        approval_type: accountType === 'BASIC' ? 2 : 1,
                                        email_notification: false,
                                        mute_upon_entry: true,
                                        registrants_confirmation_email: false,
                                        registrants_email_notification: false,
                                        participant_video: false,
                                    },
                                },
                                {
                                    headers: {
                                        Authorization: `Bearer ${accessToken}`,
                                    },
                                }
                            );

                            if (zoomRes.status === 200 || zoomRes.status === 201) {
                                const zoomData: any = zoomRes.data;

                                if (accountType === 'LICENSED') {
                                    // Perform batch registration for all the users in the course (not owners)
                                    await registerUsersToMeeting(accessToken, channelId, zoomData.id);
                                }

                                if (zoomData.id && recurringId) {
                                    await DateModel.updateMany(
                                        {
                                            recurringId,
                                        },
                                        {
                                            zoomMeetingId: zoomData.id,
                                            zoomStartUrl: zoomData.start_url,
                                            zoomJoinUrl: zoomData.join_url,
                                            zoomMeetingScheduledBy: userId,
                                        }
                                    );
                                }

                                return 'SUCCESS';
                            } else {
                                // Could not create zoom meeting!
                                return 'ZOOM_MEETING_CREATE_FAILED';
                            }
                        } else if (repeatTill && frequency && frequency === '1-W' && repeatDays) {
                            // Recurring weekly only on specific days

                            const utcEndTime = moment(new Date(repeatTill), 'YYYY-MM-DDTHH:mm:ss')
                                .tz('UTC')
                                .format();

                            const recurrence = {
                                type: 2,
                                repeat_interval: 1,
                                end_date_time: utcEndTime + 'Z',
                                weekly_days: repeatDays.join(','),
                            };

                            // Fetch User First and get account type of the user
                            const accountType = await getZoomAccountType(accessToken, user.zoomInfo.email);

                            if (accountType === 'ERROR') {
                                return 'ZOOM_MEETING_CREATE_FAILED';
                            }

                            // CREATE MEETING
                            const utcTime = moment(new Date(start), 'YYYY-MM-DDTHH:mm:ss')
                                .tz('UTC')
                                .format();

                            const zoomRes: any = await axios.post(
                                `https://api.zoom.us/v2/users/me/meetings`,
                                {
                                    topic: channel.name + '- ' + title,
                                    agenda: description,
                                    type: 8,
                                    start_time: utcTime + 'Z',
                                    duration,
                                    recurrence,
                                    settings: {
                                        approval_type: accountType === 'BASIC' ? 2 : 1,
                                        email_notification: false,
                                        mute_upon_entry: true,
                                        registrants_confirmation_email: false,
                                        registrants_email_notification: false,
                                        participant_video: false,
                                    },
                                },
                                {
                                    headers: {
                                        Authorization: `Bearer ${accessToken}`,
                                    },
                                }
                            );

                            if (zoomRes.status === 200 || zoomRes.status === 201) {
                                const zoomData: any = zoomRes.data;

                                if (accountType === 'LICENSED') {
                                    // Perform batch registration for all the users in the course (not owners)
                                    await registerUsersToMeeting(accessToken, channelId, zoomData.id);
                                }

                                if (zoomData.id && recurringId !== '') {
                                    await DateModel.updateMany(
                                        {
                                            recurringId,
                                        },
                                        {
                                            zoomMeetingId: zoomData.id,
                                            zoomStartUrl: zoomData.start_url,
                                            zoomJoinUrl: zoomData.join_url,
                                            zoomMeetingScheduledBy: userId,
                                        }
                                    );
                                }

                                return 'SUCCESS';
                            } else {
                                // Could not create zoom meeting!
                                return 'ZOOM_MEETING_CREATE_FAILED';
                            }
                        } else {
                            // Not recurring

                            // Fetch User First and get account type of the user
                            const accountType = await getZoomAccountType(accessToken, user.zoomInfo.email);

                            if (accountType === 'ERROR') {
                                return 'ZOOM_MEETING_CREATE_FAILED';
                            }

                            // CREATE MEETING
                            const utcTime = moment(new Date(start), 'YYYY-MM-DDTHH:mm:ss')
                                .tz('UTC')
                                .format();

                            const zoomRes: any = await axios.post(
                                `https://api.zoom.us/v2/users/me/meetings`,
                                {
                                    topic: channel.name + '- ' + title,
                                    agenda: description,
                                    type: 2,
                                    start_time: utcTime + 'Z',
                                    duration,
                                    settings: {
                                        approval_type: accountType === 'BASIC' ? 2 : 1,
                                        email_notification: false,
                                        mute_upon_entry: true,
                                        registrants_confirmation_email: false,
                                        registrants_email_notification: false,
                                        participant_video: false,
                                    },
                                },
                                {
                                    headers: {
                                        Authorization: `Bearer ${accessToken}`,
                                    },
                                }
                            );

                            if (zoomRes.status === 200 || zoomRes.status === 201) {
                                const zoomData: any = zoomRes.data;

                                if (accountType === 'LICENSED') {
                                    // Perform batch registration for all the users in the course (not owners)
                                    await registerUsersToMeeting(accessToken, channelId, zoomData.id);
                                }

                                if (zoomData.id && newObj) {
                                    await DateModel.updateOne(
                                        {
                                            _id: newObj._id,
                                        },
                                        {
                                            zoomMeetingId: zoomData.id,
                                            zoomStartUrl: zoomData.start_url,
                                            zoomJoinUrl: zoomData.join_url,
                                            zoomMeetingScheduledBy: userId,
                                        }
                                    );
                                }

                                return 'SUCCESS';
                            } else {
                                // Could not create zoom meeting!
                                return 'ZOOM_MEETING_CREATE_FAILED';
                            }
                        }
                    }
                }
            }

            // Notifications
            const messages: any[] = [];
            const userIds: any[] = [];

            const subscriptions = await SubscriptionModel.find({
                $and: [{ channelId }, { unsubscribedAt: { $exists: false } }],
            });
            subscriptions.map((s) => {
                userIds.push(s.userId);
            });

            const channel: any = await ChannelModel.findById(channelId);
            const users: any[] = await UserModel.find({ _id: { $in: userIds } });

            // Web notifications

            const oneSignalClient = new OneSignal.Client(
                '78cd253e-262d-4517-a710-8719abf3ee55',
                'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
            );

            const notification = {
                contents: {
                    en: `${channel.name}` + ' - New event scheduled - ' + title,
                },
                include_external_user_ids: userIds,
            };

            if (userIds.length > 0) {
                const response = await oneSignalClient.createNotification(notification);
            }

            users.map((sub) => {
                const notificationIds = sub.notificationId.split('-BREAK-');
                notificationIds.map((notifId: any) => {
                    if (!Expo.isExpoPushToken(notifId)) {
                        return;
                    }
                    messages.push({
                        to: notifId,
                        sound: 'default',
                        subtitle: 'Your instructor has scheduled a new event.',
                        title: channel.name + ' - ' + title,
                        data: { userId: sub._id },
                    });
                });
            });

            const notificationService = new Expo();
            let chunks = notificationService.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                try {
                    await notificationService.sendPushNotificationsAsync(chunk);
                } catch (e) {
                    console.error(e);
                }
            }

            return 'SUCCESS';
        } catch (e) {
            return 'ERROR';
        }
    }

    @Field((type) => String, {
        description: 'Used when you want create an event in Agenda',
    })
    public async createEventAdmin(@Arg('eventInput', (type) => EventInputAdmin) eventInput: EventInputAdmin) {
        try {
            const {
                userId,
                title,
                start,
                end,
                schoolEvent,
                meeting,
                description,
                frequency,
                repeatTill,
                repeatDays,
                selectedSegment,
                allGradesAndSections,
                allUsersSelected,
                shareWithGradesAndSections,
                selectedUsers,
                shareWithAllInstructors,
                selectedInstructors,
                shareWithAllAdmins,
                selectedAdmins,
            } = eventInput;

            // If the zoom account type is a Licensed account then we need to register users to meetings so that attendance can be captured
            const getZoomAccountType = async (zoomAccessToken: string, zoomEmail: string) => {
                const zoomRes: any = await axios.get(`https://api.zoom.us/v2/users/me?userId=${zoomEmail}`, {
                    headers: {
                        Authorization: `Bearer ${zoomAccessToken}`,
                    },
                });

                console.log('Zoom res get user', zoomRes);

                if (zoomRes.status === 200) {
                    console.log('Get User object', zoomRes.data);

                    const zoomData: any = zoomRes.data;

                    if (zoomData.type === 1) {
                        return 'BASIC';
                    } else {
                        return 'LICENSED';
                    }
                }

                return 'ERROR';
            };

            const registerUsersToMeeting = async (
                zoomAccessToken: string,
                userIds: string[],
                zoomMeetingId: string,
                schoolId: string
            ) => {
                const users = await UserModel.find({ _id: { $in: userIds } });

                users.map(async (user: IUserModel) => {
                    const u = user.toObject();

                    console.log('User', u);

                    console.log(
                        'Register user url',
                        `https://api.zoom.us/v2/meetings/${Number(zoomMeetingId)}/registrants`
                    );

                    try {
                        const zoomRes: any = await axios.post(
                            `https://api.zoom.us/v2/meetings/${Number(zoomMeetingId)}/registrants`,
                            {
                                first_name: u.fullName,
                                last_name: 'Cues',
                                email: u.email,
                                auto_approve: true,
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${zoomAccessToken}`,
                                },
                            }
                        );

                        console.log('Zoom res register user', zoomRes);

                        if (zoomRes.status === 201) {
                            const zoomData: any = zoomRes.data;

                            console.log('Register user object', zoomRes.data);

                            const zoomRegistration = await ZoomRegistrationModel.create({
                                userId: u._id,
                                schoolId,
                                zoomMeetingId,
                                zoom_join_url: zoomData.join_url,
                                registrant_id: zoomData.registrant_id,
                                zoomRegistrationId: zoomData.id.toString(),
                            });
                        }
                    } catch (e) {
                        console.log('Error with registering', e);
                    }
                });
            };

            // isNonMeetingChannelEvent is set to undefined to differentiate meetings from events

            const fetchUser = await UserModel.findById(userId);

            let useZoom = false;

            if (!fetchUser) {
                return 'INVALID_USER';
            }

            // Check the meeting provider if it is a meeting
            if (fetchUser.schoolId && meeting) {
                const org = await SchoolsModel.findById(fetchUser.schoolId);

                if (org && org.meetingProvider && org.meetingProvider !== '') {
                    useZoom = false;
                } else {
                    useZoom = true;
                }
            }

            let recurringId = nanoid();

            let newObj = null;

            const diff = Math.abs(new Date(start).getTime() - new Date(end).getTime());

            const duration = Math.round(diff / 60000);

            if (repeatTill && frequency && frequency !== '1-W') {
                // Construct dates for creating and set a recurring Id
                const dates = this.getAllDates(start, frequency, repeatTill);

                // const recurringId = nanoid();

                for (let i = 0; i < dates.length; i++) {
                    const scheduledDate = dates[i];

                    const startDate = new Date(start);

                    const endDate = new Date(end);

                    // Update start and end date to Scheduled Date
                    // startDate.setDate(scheduledDate.getDate());
                    startDate.setMonth(scheduledDate.getMonth(), scheduledDate.getDate());

                    // endDate.setDate(scheduledDate.getDate());
                    endDate.setMonth(scheduledDate.getMonth(), scheduledDate.getDate());

                    await DateModel.create({
                        userId,
                        title,
                        start: startDate,
                        end: endDate,
                        isNonMeetingSchoolEvent: !meeting,
                        schoolId: schoolEvent ? fetchUser.schoolId : undefined,
                        description,
                        recurringId,
                        // School events
                        selectedSegment,
                        allGradesAndSections,
                        allUsersSelected,
                        shareWithGradesAndSections,
                        selectedUsers,
                        shareWithAllInstructors,
                        selectedInstructors,
                        shareWithAllAdmins,
                        selectedAdmins,
                    });
                }
            } else if (repeatTill && frequency && frequency === '1-W' && repeatDays) {
                const startDate = new Date(start);

                const startDay = startDate.getDay() + 1;

                let allDates: any[] = [];

                // Build a map of all start days for RepeatDays
                for (let i = 0; i < repeatDays.length; i++) {
                    let key = repeatDays[i];
                    let beginDate = '';

                    if (startDay.toString() === key) {
                        beginDate = startDate.toUTCString();
                    } else if (Number(key) > startDay) {
                        const newDate = new Date(start);
                        newDate.setDate(newDate.getDate() + (Number(key) - startDay));
                        beginDate = newDate.toUTCString();
                    } else {
                        const newDate = new Date(start);
                        const diff = 7 - startDay + Number(key);
                        newDate.setDate(newDate.getDate() + diff);
                        beginDate = newDate.toUTCString();
                    }

                    const dates = this.getAllDates(beginDate, frequency, repeatTill);
                    allDates = [...allDates, ...dates];
                }

                for (let i = 0; i < allDates.length; i++) {
                    const scheduledDate = allDates[i];

                    const startDate = new Date(start);

                    const endDate = new Date(end);

                    // Update start and end date to Scheduled Date
                    startDate.setMonth(scheduledDate.getMonth(), scheduledDate.getDate());
                    endDate.setMonth(scheduledDate.getMonth(), scheduledDate.getDate());

                    await DateModel.create({
                        userId,
                        title,
                        start: startDate,
                        end: endDate,
                        isNonMeetingSchoolEvent: !meeting,
                        schoolId: schoolEvent ? fetchUser.schoolId : undefined,
                        description,
                        recurringId,
                        selectedSegment,
                        allGradesAndSections,
                        allUsersSelected,
                        shareWithGradesAndSections,
                        selectedUsers,
                        shareWithAllInstructors,
                        selectedInstructors,
                        shareWithAllAdmins,
                        selectedAdmins,
                    });
                }
            } else {
                newObj = await DateModel.create({
                    userId,
                    title,
                    description,
                    start: new Date(start),
                    end: new Date(end),
                    isNonMeetingSchoolEvent: !meeting,
                    schoolId: schoolEvent ? fetchUser.schoolId : undefined,
                    selectedSegment,
                    allGradesAndSections,
                    allUsersSelected,
                    shareWithGradesAndSections,
                    selectedUsers,
                    shareWithAllInstructors,
                    selectedInstructors,
                    shareWithAllAdmins,
                    selectedAdmins,
                });
            }

            // IF no meeting just return

            if (!meeting) return 'SUCCESS';

            if (meeting && useZoom) {
                // if (!channelId) return 'SUCCESS';

                let accessToken = '';
                const u: any = await UserModel.findById(userId);

                if (u) {
                    const user = u.toObject();

                    if (!user.zoomInfo) {
                        return 'error';
                    } else {
                        accessToken = user.zoomInfo.accessToken;
                    }

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
                            return 'ZOOM_MEETING_CREATE_FAILED';
                        }

                        const zoomData: any = zoomRes.data;

                        const eOn = new Date();
                        eOn.setSeconds(
                            eOn.getSeconds() +
                                (Number.isNaN(Number(zoomData.expires_in)) ? 0 : Number(zoomData.expires_in))
                        );

                        accessToken = zoomData.access_token;

                        await UserModel.updateOne(
                            { _id: userId },
                            {
                                zoomInfo: {
                                    ...user.zoomInfo,
                                    accessToken: zoomData.access_token,
                                    refreshToken: zoomData.refresh_token,
                                    expiresOn: eOn, // saved as a date
                                },
                            }
                        );
                    }

                    // let allUsers = [];

                    // if (shareWithUsers && shareWithUsers.length > 0) {
                    //     allUsers.push(...shareWithUsers);
                    // }

                    // if (shareWithInstructors && shareWithInstructors.length > 0) {
                    //     allUsers.push(...shareWithInstructors);
                    // }

                    // if (shareWithAdmins && shareWithAdmins.length > 0) {
                    //     allUsers.push(...shareWithAdmins);
                    // }

                    if (repeatTill && frequency && frequency !== '1-W') {
                        // Recurring but no specific days
                        let type;
                        let repeat_interval;

                        if (frequency === '2-W') {
                            type = 2;
                            repeat_interval = 2;
                        } else if (frequency === '1-M') {
                            type = 3;
                            repeat_interval = 1;
                        } else if (frequency === '2-M') {
                            type = 3;
                            repeat_interval = 2;
                        } else if (frequency === '3-M') {
                            type = 3;
                            repeat_interval = 2;
                        }

                        const utcEndTime = moment(new Date(repeatTill), 'YYYY-MM-DDTHH:mm:ss')
                            .tz('UTC')
                            .format();

                        let recurrence: any = {
                            type,
                            repeat_interval,
                            end_date_time: utcEndTime + 'Z',
                        };

                        if (type === 3) {
                            recurrence.monthly_day = new Date(start).getDate();
                        }

                        // Fetch User First and get account type of the user
                        // const accountType = await getZoomAccountType(accessToken, user.zoomInfo.email);

                        // if (accountType === 'ERROR') {
                        //     return 'ZOOM_MEETING_CREATE_FAILED';
                        // }

                        // CREATE MEETING
                        const utcTime = moment(new Date(start), 'YYYY-MM-DDTHH:mm:ss')
                            .tz('UTC')
                            .format();

                        const zoomRes: any = await axios.post(
                            `https://api.zoom.us/v2/users/me/meetings`,
                            {
                                topic: title,
                                agenda: description,
                                type: 8,
                                start_time: utcTime + 'Z',
                                duration,
                                recurrence,
                                settings: {
                                    approval_type: 2,
                                    email_notification: false,
                                    mute_upon_entry: true,
                                    registrants_confirmation_email: false,
                                    registrants_email_notification: false,
                                    participant_video: false,
                                },
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                },
                            }
                        );

                        if (zoomRes.status === 200 || zoomRes.status === 201) {
                            const zoomData: any = zoomRes.data;

                            // if (accountType === 'LICENSED') {
                            //     // Perform batch registration for all the users in the course (not owners)
                            //     await registerUsersToMeeting(accessToken, allUsers, zoomData.id, user.schoolId);
                            // }

                            if (zoomData.id && recurringId) {
                                await DateModel.updateMany(
                                    {
                                        recurringId,
                                    },
                                    {
                                        zoomMeetingId: zoomData.id,
                                        zoomStartUrl: zoomData.start_url,
                                        zoomJoinUrl: zoomData.join_url,
                                        zoomMeetingScheduledBy: userId,
                                    }
                                );
                            }

                            return 'SUCCESS';
                        } else {
                            // Could not create zoom meeting!
                            return 'ZOOM_MEETING_CREATE_FAILED';
                        }
                    } else if (repeatTill && frequency && frequency === '1-W' && repeatDays) {
                        // Recurring weekly only on specific days

                        const utcEndTime = moment(new Date(repeatTill), 'YYYY-MM-DDTHH:mm:ss')
                            .tz('UTC')
                            .format();

                        const recurrence = {
                            type: 2,
                            repeat_interval: 1,
                            end_date_time: utcEndTime + 'Z',
                            weekly_days: repeatDays.join(','),
                        };

                        // Fetch User First and get account type of the user
                        // const accountType = await getZoomAccountType(accessToken, user.zoomInfo.email);

                        // if (accountType === 'ERROR') {
                        //     return 'ZOOM_MEETING_CREATE_FAILED';
                        // }

                        // CREATE MEETING
                        const utcTime = moment(new Date(start), 'YYYY-MM-DDTHH:mm:ss')
                            .tz('UTC')
                            .format();

                        const zoomRes: any = await axios.post(
                            `https://api.zoom.us/v2/users/me/meetings`,
                            {
                                topic: title,
                                agenda: description,
                                type: 8,
                                start_time: utcTime + 'Z',
                                duration,
                                recurrence,
                                settings: {
                                    approval_type: 2,
                                    email_notification: false,
                                    mute_upon_entry: true,
                                    registrants_confirmation_email: false,
                                    registrants_email_notification: false,
                                    participant_video: false,
                                },
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                },
                            }
                        );

                        if (zoomRes.status === 200 || zoomRes.status === 201) {
                            const zoomData: any = zoomRes.data;

                            // if (accountType === 'LICENSED') {
                            //     await registerUsersToMeeting(accessToken, allUsers, zoomData.id, user.schoolId);
                            // }

                            if (zoomData.id && recurringId !== '') {
                                await DateModel.updateMany(
                                    {
                                        recurringId,
                                    },
                                    {
                                        zoomMeetingId: zoomData.id,
                                        zoomStartUrl: zoomData.start_url,
                                        zoomJoinUrl: zoomData.join_url,
                                        zoomMeetingScheduledBy: userId,
                                    }
                                );
                            }

                            return 'SUCCESS';
                        } else {
                            // Could not create zoom meeting!
                            return 'ZOOM_MEETING_CREATE_FAILED';
                        }
                    } else {
                        // Not recurring

                        // Fetch User First and get account type of the user
                        // const accountType = await getZoomAccountType(accessToken, user.zoomInfo.email);

                        // if (accountType === 'ERROR') {
                        //     return 'ZOOM_MEETING_CREATE_FAILED';
                        // }

                        // CREATE MEETING
                        const utcTime = moment(new Date(start), 'YYYY-MM-DDTHH:mm:ss')
                            .tz('UTC')
                            .format();

                        const zoomRes: any = await axios.post(
                            `https://api.zoom.us/v2/users/me/meetings`,
                            {
                                topic: title,
                                agenda: description,
                                type: 2,
                                start_time: utcTime + 'Z',
                                duration,
                                settings: {
                                    approval_type: 2,
                                    email_notification: false,
                                    mute_upon_entry: true,
                                    registrants_confirmation_email: false,
                                    registrants_email_notification: false,
                                    participant_video: false,
                                },
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                },
                            }
                        );

                        if (zoomRes.status === 200 || zoomRes.status === 201) {
                            const zoomData: any = zoomRes.data;

                            // if (accountType === 'LICENSED') {
                            //     await registerUsersToMeeting(accessToken, allUsers, zoomData.id, user.schoolId);
                            // }

                            if (zoomData.id && newObj) {
                                await DateModel.updateOne(
                                    {
                                        _id: newObj._id,
                                    },
                                    {
                                        zoomMeetingId: zoomData.id,
                                        zoomStartUrl: zoomData.start_url,
                                        zoomJoinUrl: zoomData.join_url,
                                        zoomMeetingScheduledBy: userId,
                                    }
                                );
                            }

                            return 'SUCCESS';
                        } else {
                            // Could not create zoom meeting!
                            return 'ZOOM_MEETING_CREATE_FAILED';
                        }
                    }
                }
            }

            // Notifications
            // const messages: any[] = [];
            // const userIds: any[] = [];

            // const subscriptions = await SubscriptionModel.find({
            //     $and: [{ channelId }, { unsubscribedAt: { $exists: false } }],
            // });
            // subscriptions.map((s) => {
            //     userIds.push(s.userId);
            // });

            // const channel: any = await ChannelModel.findById(channelId);
            // const users: any[] = await UserModel.find({ _id: { $in: userIds } });

            // // Web notifications

            // const oneSignalClient = new OneSignal.Client(
            //     '78cd253e-262d-4517-a710-8719abf3ee55',
            //     'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
            // );

            // const notification = {
            //     contents: {
            //         en: `${channel.name}` + ' - New event scheduled - ' + title,
            //     },
            //     include_external_user_ids: userIds,
            // };

            // if (userIds.length > 0) {
            //     const response = await oneSignalClient.createNotification(notification);
            // }

            // users.map((sub) => {
            //     const notificationIds = sub.notificationId.split('-BREAK-');
            //     notificationIds.map((notifId: any) => {
            //         if (!Expo.isExpoPushToken(notifId)) {
            //             return;
            //         }
            //         messages.push({
            //             to: notifId,
            //             sound: 'default',
            //             subtitle: 'Your instructor has scheduled a new event.',
            //             title: channel.name + ' - ' + title,
            //             data: { userId: sub._id },
            //         });
            //     });
            // });

            // const notificationService = new Expo();
            // let chunks = notificationService.chunkPushNotifications(messages);
            // for (let chunk of chunks) {
            //     try {
            //         await notificationService.sendPushNotificationsAsync(chunk);
            //     } catch (e) {
            //         console.error(e);
            //     }
            // }

            return 'SUCCESS';
        } catch (e) {
            return 'ERROR';
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async editEventAdmin(@Arg('eventInput', (type) => EditEventInputAdmin) eventInput: EditEventInputAdmin) {
        try {
            const {
                id,
                title,
                start,
                end,
                description,
                selectedSegment,
                allGradesAndSections,
                allUsersSelected,
                shareWithGradesAndSections,
                selectedUsers,
                shareWithAllInstructors,
                selectedInstructors,
                shareWithAllAdmins,
                selectedAdmins,
            } = eventInput;

            // Fetch current date
            const fetch = await DateModel.findById(id);

            if (!fetch) return false;

            const update = await DateModel.updateOne(
                { _id: id },
                {
                    title,
                    start: new Date(start),
                    end: new Date(end),
                    description,
                    selectedSegment,
                    allGradesAndSections,
                    allUsersSelected,
                    shareWithGradesAndSections,
                    selectedUsers,
                    shareWithAllInstructors,
                    selectedInstructors,
                    shareWithAllAdmins,
                    selectedAdmins,
                }
            );
            //return true;
            //return update.modifiedCount > 0;
            return update.nModified > 0;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => EventObject, {
        description: 'Creates new zoom Meeting for existing Date id',
    })
    public async regenZoomMeeting(
        @Arg('userId', (type) => String) userId: string,
        @Arg('dateId', (type) => String) dateId: string
    ) {
        try {
            const dateObject = await DateModel.findById(dateId);

            const u = await UserModel.findById(userId);

            if (u && dateObject) {
                const channelId = dateObject.scheduledMeetingForChannelId;

                if (!channelId) return null;

                const channel = await ChannelModel.findById(channelId);

                if (!channel) return null;

                const diff = Math.abs(new Date(dateObject.start).getTime() - new Date(dateObject.end).getTime());

                const duration = Math.round(diff / 60000);

                const user = u.toObject();

                let accessToken = '';

                if (!user.zoomInfo) {
                    return null;
                } else {
                    accessToken = user.zoomInfo.accessToken;
                }

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
                        return null;
                    }

                    const zoomData: any = zoomRes.data;

                    const eOn = new Date();
                    eOn.setSeconds(
                        eOn.getSeconds() + (Number.isNaN(Number(zoomData.expires_in)) ? 0 : Number(zoomData.expires_in))
                    );

                    accessToken = zoomData.access_token;

                    await UserModel.updateOne(
                        { _id: userId },
                        {
                            zoomInfo: {
                                ...user.zoomInfo,
                                accessToken: zoomData.access_token,
                                refreshToken: zoomData.refresh_token,
                                expiresOn: eOn, // saved as a date
                            },
                        }
                    );
                }

                const utcTime = moment(new Date(dateObject.start), 'YYYY-MM-DDTHH:mm:ss')
                    .tz('UTC')
                    .format();

                const zoomRes: any = await axios.post(
                    `https://api.zoom.us/v2/users/me/meetings`,
                    {
                        topic: channel.name + '- ' + dateObject.title,
                        agenda: dateObject.description,
                        type: 2,
                        start_time: utcTime + 'Z',
                        duration,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );

                if (zoomRes.status === 200 || zoomRes.status === 201) {
                    const zoomData: any = zoomRes.data;

                    if (zoomData.id) {
                        await DateModel.updateOne(
                            {
                                _id: dateId,
                            },
                            {
                                zoomMeetingId: zoomData.id,
                                zoomStartUrl: zoomData.start_url,
                                zoomJoinUrl: zoomData.join_url,
                                zoomMeetingScheduledBy: userId,
                            }
                        );

                        const updatedDate = await DateModel.findById(dateId);

                        if (updatedDate) {
                            const obj = updatedDate.toObject();

                            return {
                                ...obj,
                                title: obj.title,
                                dateId: obj._id,
                                meeting: true,
                                cueId: '',
                                zoomMeetingId: obj.zoomMeetingId,
                                zoomStartUrl: obj.zoomStartUrl,
                                zoomJoinUrl: obj.zoomJoinUrl,
                                zoomMeetingScheduledBy: obj.zoomMeetingScheduledBy,
                            };
                        }

                        return null;
                    }
                }
            }

            return null;
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async editV1(
        @Arg('id', (type) => String) id: string,
        @Arg('title', (type) => String) title: string,
        @Arg('start', (type) => String) start: string,
        @Arg('end', (type) => String) end: string,
        @Arg('description', (type) => String, { nullable: true })
        description?: string,
        @Arg('recordMeeting', (type) => Boolean, { nullable: true })
        recordMeeting?: boolean
    ) {
        try {
            // Fetch current date
            const fetch = await DateModel.findById(id);

            if (!fetch) return false;

            const update = await DateModel.updateOne(
                { _id: id },
                {
                    title,
                    start: new Date(start),
                    end: new Date(end),
                    description,
                    recordMeeting,
                }
            );
            //return true;
            //return update.modifiedCount > 0;
            return update.nModified > 0;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => [Date], {
        description: 'Used when you want to delete a date.',
    })
    private getAllDates(
        @Arg('start', (type) => String) start: string,
        @Arg('frequency', (type) => String) frequency: string,
        @Arg('repeatTill', (type) => String) repeatTill: string
    ) {
        const currentDate = new Date(start);

        let loopDate = currentDate;

        const endDate = new Date(repeatTill);

        let dates = [];

        while (loopDate <= endDate) {
            // New Date to prevent same Object ref
            dates.push(new Date(loopDate));

            switch (frequency) {
                case '1-W':
                    loopDate.setDate(loopDate.getDate() + 7);
                    break;
                case '2-W':
                    loopDate.setDate(loopDate.getDate() + 14);
                    break;
                case '1-M':
                    loopDate.setMonth(loopDate.getMonth() + 1);
                    break;
                case '2-M':
                    loopDate.setMonth(loopDate.getMonth() + 2);
                    break;
                case '3-M':
                    loopDate.setMonth(loopDate.getMonth() + 3);
                    break;
            }
        }

        return dates;
    }

    @Field((type) => String, {
        description: 'Used when you want to delete a date.',
    })
    public async deleteV1(
        @Arg('id', (type) => String) id: string,
        @Arg('deleteAll', (type) => Boolean) deleteAll: boolean
    ) {
        try {
            console.log(id);

            let zoomMeetingId = '';
            let zoomMeetingScheduledBy = '';

            if (deleteAll) {
                const date = await DateModel.findOne({ recurringId: id });

                if (date && date.zoomMeetingId && date.zoomMeetingScheduledBy) {
                    zoomMeetingId = date.zoomMeetingId;
                    zoomMeetingScheduledBy = date.zoomMeetingScheduledBy;
                }

                await DateModel.deleteMany({ recurringId: id });
            } else {
                const date = await DateModel.findOne({ _id: id });

                // If recurring but only one occurrence deleted then don't delete the zoom meeting
                if (date && date.zoomMeetingId && date.zoomMeetingScheduledBy && !date.recurringId) {
                    zoomMeetingId = date.zoomMeetingId;
                    zoomMeetingScheduledBy = date.zoomMeetingScheduledBy;
                }

                await DateModel.deleteOne({ _id: id });
            }

            if (zoomMeetingId !== '' && zoomMeetingScheduledBy !== '') {
                let accessToken = '';
                const u: any = await UserModel.findById(zoomMeetingScheduledBy);
                if (u) {
                    const user = u.toObject();

                    if (!user.zoomInfo) {
                        return 'ZOOM_MEETING_DELETE_FAILED';
                    } else {
                        accessToken = user.zoomInfo.accessToken;
                    }

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
                            return 'ZOOM_MEETING_DELETE_FAILED';
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
                    }

                    // delete meeting

                    const zoomRes: any = await axios.delete(`https://api.zoom.us/v2/meetings/${zoomMeetingId}`, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    });

                    if (zoomRes.status !== 204) {
                        return 'ZOOM_MEETING_DELETE_FAILED';
                    } else {
                        return 'SUCCESS';
                    }
                }
            }

            return 'SUCCESS';
        } catch (e) {
            return 'ERROR';
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to delete a date.',
    })
    public async delete(@Arg('dateId', (type) => String) dateId: string) {
        try {
            await DateModel.deleteOne({ _id: dateId });
            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to edit the meeting title or recording link',
    })
    public async editPastMeeting(
        @Arg('dateId', (type) => String)
        dateId: string,
        @Arg('title', (type) => String)
        title: string,
        @Arg('recordingLink', (type) => String, { nullable: true })
        recordingLink?: string
    ) {
        try {
            if (!dateId || !title) {
                return false;
            }

            const fetchDate = await DateModel.findById(dateId);

            if (!fetchDate) {
                return false;
            }

            // Update
            const update = await DateModel.updateOne(
                {
                    _id: dateId,
                },
                {
                    title,
                    recordingLink: recordingLink ? recordingLink : undefined,
                }
            );

            return true;
        } catch (e) {
            return false;
        }
    }
}
