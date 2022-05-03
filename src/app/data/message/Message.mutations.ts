import { htmlStringParser } from '@helper/HTMLParser';
import Expo from 'expo-server-sdk';
import { Arg, Field, ObjectType } from 'type-graphql';
import { GroupModel } from '../group/mongo/Group.model';
import { MessageStatusModel } from '../message-status/mongo/message-status.model';
import { UserModel } from '../user/mongo/User.model';
import { MessageModel } from './mongo/Message.model';

import * as OneSignal from 'onesignal-node';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { SchoolsModel } from '../school/mongo/School.model';
import { zoomClientId, zoomClientSecret } from '../../../helpers/zoomCredentials';
import axios from 'axios';
import moment from 'moment';
import { group } from 'console';
import { DateModel } from '../dates/mongo/dates.model';

/**
 * Message Mutation Endpoints
 */
@ObjectType()
export class MessageMutationResolver {
    @Field((type) => Boolean, {
        description: 'Used to create a message.',
    })
    public async create(
        @Arg('users', (type) => [String])
        users: string[],
        @Arg('message', (type) => String)
        message: string,
        @Arg('channelId', (type) => String)
        channelId: string,
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            if (users.length === 0) {
                return false;
            }
            const groupDoc = await GroupModel.findOne({
                users: { $all: users },
            });
            let groupId = '';
            if (groupDoc) {
                groupId = groupDoc._id;
            } else {
                const newGroup = await GroupModel.create({
                    users,
                    channelId,
                });
                groupId = newGroup._id;
            }
            await MessageModel.create({
                groupId,
                message,
                sentBy: userId,
                sentAt: new Date(),
            });
            users.map(async (u, i) => {
                if (i === 0) {
                    return;
                }
                await MessageStatusModel.create({
                    groupId,
                    userId: users[i],
                    channelId,
                });
            });
            const userIds: any[] = [];
            const messages: any[] = [];
            const notificationService = new Expo();

            users.map((u) => {
                userIds.push(u);
            });

            const userArr = await UserModel.find({ _id: { $in: userIds } });

            const sentByUser = await UserModel.findById(userId);

            const fetchMessageChannel = await ChannelModel.findById(channelId);

            let senderName = '';
            userArr.map((sub: any, i: any) => {
                if (i === 0) {
                    senderName = sub.fullName;
                    return;
                }
                const notificationIds = sub.notificationId.split('-BREAK-');
                notificationIds.map((notifId: any) => {
                    if (!Expo.isExpoPushToken(notifId)) {
                        return;
                    }
                    const { title, subtitle: body } = htmlStringParser(message);
                    messages.push({
                        to: notifId,
                        sound: 'default',
                        title:
                            fetchMessageChannel && sentByUser
                                ? `${fetchMessageChannel.name}- ` + 'New Message from ' + sentByUser.fullName
                                : 'New message',
                        subtitle: title,
                        data: { userId: sub._id },
                    });
                });
            });

            // Web notifications

            const { title, subtitle: body } = htmlStringParser(message);

            const oneSignalClient = new OneSignal.Client(
                '78cd253e-262d-4517-a710-8719abf3ee55',
                'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
            );

            const notification = {
                contents: {
                    en:
                        fetchMessageChannel && sentByUser
                            ? `${fetchMessageChannel.name}- ` + sentByUser.fullName + ': ' + title
                            : 'New message',
                },
                include_external_user_ids: userIds,
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
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used to create a message.',
    })
    public async createDirect(
        @Arg('users', (type) => [String])
        users: string[],
        @Arg('message', (type) => String)
        message: string,
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('channelId', (type) => String, { nullable: true })
        channelId?: string,
        @Arg('groupId', (type) => String, { nullable: true })
        groupId?: string,
        // Group name is a must for identifying groups that have been made
        @Arg('groupName', (type) => String, { nullable: true })
        groupName?: string,
        @Arg('groupImage', (type) => String, { nullable: true })
        groupImage?: string
    ) {
        try {
            if (users.length === 0) {
                return false;
            }

            let id = groupId;

            // Create new group if no groupId passed in
            if (!groupId || groupId === '') {
                // Check by chance there is chat that already exist with same users
                if (!groupName) {
                    const foundDuplicate = await GroupModel.findOne({
                        users: { $all: users, $size: users.length },
                        name: { $exists: false },
                    });

                    if (foundDuplicate && foundDuplicate._id) {
                        id = foundDuplicate._id;
                    } else {
                        const newGroup = await GroupModel.create({
                            users,
                            channelId,
                            name: groupName,
                            image: groupImage,
                            createdBy: userId,
                        });

                        id = newGroup._id;
                    }
                } else {
                    const newGroup = await GroupModel.create({
                        users,
                        channelId,
                        name: groupName,
                        image: groupImage,
                        createdBy: userId,
                    });

                    id = newGroup._id;
                }
            } else {
                // Existing chats or groups
                let groupDoc: any = {};

                groupDoc = await GroupModel.findOne({
                    _id: groupId,
                });

                id = groupDoc._id;
            }

            await MessageModel.create({
                groupId: id,
                message,
                sentBy: userId,
                sentAt: new Date(),
            });
            users.map(async (u, i) => {
                if (userId === u) {
                    return;
                }
                await MessageStatusModel.create({
                    groupId: id,
                    userId: users[i],
                    channelId,
                });
            });
            let userIds: any[] = [];
            const messages: any[] = [];
            const notificationService = new Expo();

            users.map((u) => {
                userIds.push(u);
            });

            const userArr = await UserModel.find({ _id: { $in: userIds } });

            const sentByUser = await UserModel.findById(userId);

            // Need to update message for groups / User

            userArr.map((sub: any, i: any) => {
                // Remove sent by from notifications
                if (sub._id.toString() === userId.toString()) {
                    return;
                }

                const notificationIds = sub.notificationId.split('-BREAK-');
                notificationIds.map((notifId: any) => {
                    console.log('Send notification to ID', notifId);
                    if (!Expo.isExpoPushToken(notifId)) {
                        return;
                    }
                    const { title, subtitle: body } = htmlStringParser(message);
                    messages.push({
                        to: notifId,
                        sound: 'default',
                        title: sentByUser ? 'New Message from ' + sentByUser.fullName : 'New message',
                        subtitle: title,
                        data: { userId: sub._id },
                    });
                });
            });

            // Web notifications

            const { title, subtitle: body } = htmlStringParser(message);

            const oneSignalClient = new OneSignal.Client(
                '78cd253e-262d-4517-a710-8719abf3ee55',
                'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
            );

            // Remove sent by from notifications
            userIds = userIds.filter((id) => id !== userId);

            const notification = {
                contents: {
                    en: sentByUser ? sentByUser.fullName + ': ' + title : 'New message',
                },
                include_external_user_ids: userIds,
            };

            if (userIds.length > 0) {
                const response = await oneSignalClient.createNotification(notification);
            }

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
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used to create a message.',
    })
    public async updateGroup(
        @Arg('groupId', (type) => String)
        groupId: string,
        @Arg('users', (type) => [String])
        users: string[],
        @Arg('groupName', (type) => String)
        groupName: string,
        @Arg('groupImage', (type) => String, { nullable: true })
        groupImage?: string
    ) {
        try {
            if (!users) return;

            const update = await GroupModel.updateOne(
                {
                    _id: groupId,
                },
                {
                    name: groupName,
                    image: groupImage,
                    users,
                }
            );

            return update.nModified > 0;
        } catch (e) {
            console.log('error', e);
            return false;
        }
    }

    @Field((type) => String, {
        description: 'Used when you want to create/join a meeting.',
    })
    public async startInstantMeetingInbox(
        @Arg('userId', (type) => String) userId: string,
        @Arg('start', (type) => String) start: string,
        @Arg('end', (type) => String) end: string,
        @Arg('users', (type) => [String]) users: string[],
        @Arg('groupId', (type) => String, { nullable: true })
        groupId?: string,
        @Arg('topic', (type) => String, { nullable: true })
        topic?: string
    ) {
        try {
            const diff = Math.abs(new Date(start).getTime() - new Date(end).getTime());

            const duration = Math.round(diff / 60000);

            let accessToken = '';
            const u: any = await UserModel.findById(userId);

            if (users.length === 0) {
                return false;
            }

            let id = groupId;

            // Create new group if no groupId passed in
            if (!groupId || groupId === '') {
                const newGroup = await GroupModel.create({
                    users,
                    createdBy: userId,
                });

                id = newGroup._id;
            } else {
                // Existing chats or groups
                let groupDoc: any = {};

                groupDoc = await GroupModel.findOne({
                    _id: groupId,
                });

                id = groupDoc._id;
            }

            if (u && id !== '') {
                const user = u.toObject();

                let useZoom = true;

                if (user.schoolId && user.schoolId !== '') {
                    const org = await SchoolsModel.findById(user.schoolId);

                    if (org && org.meetingProvider && org.meetingProvider !== '') {
                        useZoom = false;
                    }
                }

                if (useZoom) {
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

                    const fetchGroup = await GroupModel.findById(id);

                    // CREATE MEETING
                    const utcTime = moment(new Date(start), 'YYYY-MM-DDTHH:mm:ss')
                        .tz('UTC')
                        .format();

                    // create meeting
                    const zoomRes: any = await axios.post(
                        `https://api.zoom.us/v2/users/me/meetings`,
                        {
                            topic:
                                topic && topic !== ''
                                    ? topic
                                    : 'Meeting with ' +
                                      (fetchGroup && fetchGroup.name ? fetchGroup.name : user.fullName),
                            agenda: '',
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

                    if (zoomRes.status !== 200 && zoomRes.status !== 201) {
                        return 'error';
                    }

                    const zoomData: any = zoomRes.data;

                    const meetingLinkMsg = {
                        title: 'New meeting ' + (topic ? '- ' + topic : ''),
                        url: zoomData.join_url,
                        type: 'meeting_link',
                    };

                    if (zoomData.id) {
                        // Create and send link as message
                        await MessageModel.create({
                            groupId: id,
                            message: JSON.stringify(meetingLinkMsg),
                            sentBy: userId,
                            sentAt: new Date(),
                        });
                        users.map(async (u, i) => {
                            if (userId === u) {
                                return;
                            }
                            await MessageStatusModel.create({
                                groupId: id,
                                userId: users[i],
                            });
                        });

                        // Schedule a meeting with the group
                        await DateModel.create({
                            userId,
                            title: topic ? topic : '',
                            start: new Date(start),
                            end: new Date(end),
                            isNonMeetingChannelEvent: undefined,
                            scheduledMeetingForChannelId: undefined,
                            description: '',
                            zoomMeetingId: zoomData.id,
                            zoomStartUrl: zoomData.start_url,
                            zoomJoinUrl: zoomData.join_url,
                            zoomMeetingScheduledBy: userId,
                            isNonChannelMeeting: true,
                            nonChannelGroupId: id,
                        });
                    } else {
                        return 'error';
                    }

                    // Alert all the users in group
                    const userDocs = await UserModel.find({ _id: { $in: users } });
                    let title = 'Meeting with ' + (fetchGroup && fetchGroup.name ? fetchGroup.name : user.fullName);
                    let messages: any[] = [];

                    // Web notifications
                    const oneSignalClient = new OneSignal.Client(
                        '78cd253e-262d-4517-a710-8719abf3ee55',
                        'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
                    );
                    const notification = {
                        contents: {
                            en: 'Meeting with ' + (fetchGroup && fetchGroup.name ? fetchGroup.name : user.fullName),
                        },
                        include_external_user_ids: users,
                    };

                    if (users.length > 0) {
                        const response = await oneSignalClient.createNotification(notification);
                    }

                    userDocs.map((u) => {
                        const sub = u.toObject();
                        const notificationIds = sub.notificationId.split('-BREAK-');
                        notificationIds.map((notifId: any) => {
                            if (!Expo.isExpoPushToken(notifId)) {
                                return;
                            }
                            messages.push({
                                to: notifId,
                                sound: 'default',
                                subtitle: '',
                                title,
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

                    return zoomData.start_url;
                }
            }
            return 'error';
        } catch (e) {
            console.log(e);
            return 'error';
        }
    }
}
