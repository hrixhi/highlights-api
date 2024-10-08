import { htmlStringParser } from '@helper/HTMLParser';
import Expo from 'expo-server-sdk';
import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { ThreadStatusModel } from '../thread-status/mongo/thread-status.model';
import { UserModel } from '../user/mongo/User.model';
import { ThreadModel } from './mongo/Thread.model';

import * as OneSignal from 'onesignal-node';
import { CueModel } from '../cue/mongo/Cue.model';
import { ActivityModel } from '../activity/mongo/activity.model';

/**
 * Thread Mutation Endpoints
 */
@ObjectType()
export class ThreadMutationResolver {
    @Field((type) => Boolean, {
        description: 'Creates new message',
    })
    public async writeMessage(
        @Arg('message', (type) => String) message: string,
        @Arg('userId', (type) => String) userId: string,
        @Arg('channelId', (type) => String) channelId: string,
        @Arg('isPrivate', (type) => Boolean) isPrivate: boolean,
        @Arg('anonymous', (type) => Boolean) anonymous: boolean,
        @Arg('parentId', (type) => String) parentId: string,
        @Arg('cueId', (type) => String) cueId: string,
        @Arg('category', { nullable: true }) category?: string,
        @Arg('title', { nullable: true }) title?: string
    ) {
        try {
            const thread = await ThreadModel.create({
                message,
                userId,
                channelId,
                isPrivate,
                anonymous,
                time: new Date(),
                category,
                parentId: parentId === 'INIT' ? null : parentId,
                title,
            });
            if (!isPrivate) {
                // Public thread
                // Create notification & alerts for everyone in the channel
                const subscribers = await SubscriptionModel.find({
                    channelId,
                    unsubscribedAt: { $exists: false },
                });
                subscribers.map(async (s) => {
                    const subscriber = s.toObject();
                    if (s.userId.toString().trim() === userId.toString().trim()) {
                        // sender does not need notif
                        return;
                    }
                    await ThreadStatusModel.create({
                        userId: subscriber.userId,
                        threadId: parentId === 'INIT' ? thread._id : parentId,
                        channelId,
                    });
                });

                // Notifications & Activity

                // If not a reply then send a notification to everyone
                if (parentId === 'INIT') {
                    const userIds: any[] = [];
                    const messages: any[] = [];
                    const notificationService = new Expo();
                    subscribers.map((u) => {
                        // No need to add it for sender
                        if (u.userId.toString() === userId.toString()) return;
                        userIds.push(u.userId);
                    });
                    const channel: any = await ChannelModel.findById(channelId);
                    const users = await UserModel.find({ _id: { $in: userIds } });
                    const activity: any[] = [];
                    // const { title, subtitle: body } = htmlStringParser(message);
                    users.map((sub) => {
                        const notificationIds = sub.notificationId.split('-BREAK-');
                        notificationIds.map((notifId: any) => {
                            if (!Expo.isExpoPushToken(notifId)) {
                                return;
                            }

                            // A Title is required for New discussion thread
                            messages.push({
                                to: notifId,
                                sound: 'default',
                                title: channel.name + ' - New Discussion Post',
                                subtitle: title,
                                // body,
                                data: { userId: sub._id },
                            });
                        });
                        activity.push({
                            userId: sub._id,
                            subtitle: title,
                            title: 'New Discussion Post',
                            status: 'unread',
                            date: new Date(),
                            channelId: channel._id,
                            cueId: null,
                            threadId: parentId === 'INIT' ? thread._id : parentId,
                            target: 'DISCUSSION',
                        });
                    });
                    await ActivityModel.insertMany(activity);

                    // Web notifications
                    const oneSignalClient = new OneSignal.Client(
                        '78cd253e-262d-4517-a710-8719abf3ee55',
                        'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
                    );

                    const notification = {
                        contents: {
                            en: channel.name + ' - New Discussion Post: ' + title,
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
                } else {
                    // Build a set of all user Ids involved in the thread if it is a reply
                    const parent = await ThreadModel.findById(parentId);

                    const ids = new Set();

                    // Add discussion creator by default
                    if (parent) {
                        ids.add(parent.userId);
                    }

                    // Get channel owner and moderators
                    const channel: any = await ChannelModel.findById(channelId);

                    if (channel) {
                        const obj = channel.toObject();

                        ids.add(obj.createdBy);

                        if (obj.owners && obj.owners.length > 0) {
                            obj.owners.map((id: any) => ids.add(id));
                        }
                    }

                    // Get all replies for the parent if thread is not private
                    if (parent && !parent.isPrivate) {
                        const replies: any[] = await ThreadModel.find({ parentId });

                        if (replies && replies.length !== 0) {
                            replies.map((reply: any) => {
                                ids.add(reply.userId);
                            });
                        }
                    }

                    let userIds: any[] = Array.from(ids);

                    userIds = userIds.filter((id: any) => id.toString() !== userId.toString());

                    const users = await UserModel.find({ _id: { $in: userIds } });

                    const messages: any[] = [];
                    const notificationService = new Expo();

                    const activity: any[] = [];

                    const fetchParentThread = await ThreadModel.findOne({
                        _id: parentId,
                    });

                    if (!fetchParentThread) return;

                    users.map((sub) => {
                        const notificationIds = sub.notificationId.split('-BREAK-');
                        notificationIds.map((notifId: any) => {
                            if (!Expo.isExpoPushToken(notifId)) {
                                return;
                            }

                            messages.push({
                                to: notifId,
                                sound: 'default',
                                title: channel.name + ' - New Discussion Reply',
                                subtitle: fetchParentThread.title,
                                // body,
                                data: { userId: sub._id },
                            });
                        });
                        activity.push({
                            userId: sub._id,
                            subtitle: fetchParentThread.title,
                            title: 'New Discussion Reply',
                            status: 'unread',
                            date: new Date(),
                            channelId: channel._id,
                            cueId: null,
                            threadId: parentId === 'INIT' ? thread._id : parentId,
                            target: 'DISCUSSION',
                        });
                    });
                    await ActivityModel.insertMany(activity);

                    // Web notifications
                    const oneSignalClient = new OneSignal.Client(
                        '78cd253e-262d-4517-a710-8719abf3ee55',
                        'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
                    );

                    const notification = {
                        contents: {
                            en: channel.name + '- New Discussion Reply: ' + fetchParentThread.title,
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
                }
            } else {
                // Private thread
                // Create badges for the owner, moderators and sender only
                const channel = await ChannelModel.findById(channelId);
                if (channel) {
                    const obj = channel.toObject();

                    let ids = new Set();

                    ids.add(userId);
                    ids.add(obj.createdBy);

                    if (obj.owners && obj.owners.length > 0) {
                        obj.owners.map((id: any) => ids.add(id));
                    }

                    let userIds: any[] = Array.from(ids);

                    userIds = userIds.filter((id: any) => id.toString() !== userId.toString());

                    userIds.map(async (id: any) => {
                        await ThreadStatusModel.create({
                            userId: id,
                            threadId: parentId === 'INIT' ? thread._id : parentId,
                            channelId,
                        });
                    });

                    const users: any[] = await UserModel.find({ _id: { $in: userIds } });
                    const messages: any[] = [];
                    const notificationService = new Expo();

                    // const notificationIds = user.notificationId.split(
                    //     "-BREAK-"
                    // );
                    // const { title, subtitle: body } = htmlStringParser(message);

                    const activity: any[] = [];

                    users.map((sub) => {
                        const notificationIds = sub.notificationId.split('-BREAK-');
                        notificationIds.map((notifId: any) => {
                            if (!Expo.isExpoPushToken(notifId)) {
                                return;
                            }

                            messages.push({
                                to: notifId,
                                sound: 'default',
                                title: channel.name + ' - New Discussion Post',
                                subtitle: title,
                                // body,
                                data: { userId: sub._id },
                            });
                        });
                        activity.push({
                            userId: sub._id,
                            subtitle: title,
                            title: 'New Discussion Post',
                            status: 'unread',
                            date: new Date(),
                            channelId: channel._id,
                            cueId: null,
                            threadId: parentId === 'INIT' ? thread._id : parentId,
                            target: 'DISCUSSION',
                        });
                    });
                    await ActivityModel.insertMany(activity);

                    // Web notifications
                    const oneSignalClient = new OneSignal.Client(
                        '78cd253e-262d-4517-a710-8719abf3ee55',
                        'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
                    );

                    const notification = {
                        contents: {
                            en: channel.name + ' - New Discussion Post: ' + title,
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
                }
            }
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'update existing thread(s)',
    })
    public async updateThread(
        @Arg('threadId', (type) => String)
        threadId: string,
        @Arg('message', (type) => String)
        message: string,
        @Arg('anonymous', (type) => Boolean)
        anonymous: boolean
    ) {
        try {
            if (!threadId || !message) {
                return false;
            }

            // Update thread
            const thread = await ThreadModel.updateOne(
                {
                    _id: threadId,
                },
                {
                    message,
                    anonymous,
                    edited: true,
                }
            );

            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'deletes thread(s)',
    })
    public async delete(@Arg('threadId', (type) => String) threadId: string) {
        try {
            const t = await ThreadModel.findById(threadId);
            if (t) {
                const thread = t.toObject();
                if (thread.parentId) {
                    // if not parent only delete that one
                    await ThreadModel.deleteOne({ _id: threadId });

                    await ThreadStatusModel.deleteMany({
                        threadId,
                    });

                    await ActivityModel.deleteMany({
                        target: 'DISCUSSION',
                        threadId,
                    });

                    return true;
                } else {
                    // If parent, delete children also
                    await ThreadModel.deleteMany({ parentId: threadId });
                    await ThreadModel.deleteOne({ _id: threadId });

                    await ThreadStatusModel.deleteMany({
                        threadId,
                    });

                    await ActivityModel.deleteMany({
                        target: 'DISCUSSION',
                        threadId,
                    });

                    return true;
                }
            } else {
                return false;
            }
        } catch (e) {
            return false;
        }
    }
}
