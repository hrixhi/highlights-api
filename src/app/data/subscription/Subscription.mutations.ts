import Expo from 'expo-server-sdk';
import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { ThreadStatusModel } from '../thread-status/mongo/thread-status.model';
import { ThreadModel } from '../thread/mongo/Thread.model';
import * as OneSignal from 'onesignal-node';
import { UserModel } from '../user/mongo/User.model';
import { SubscriptionModel } from './mongo/Subscription.model';
import { ActivityModel } from '../activity/mongo/activity.model';
/**
 * Subscription Mutation Endpoints
 */
@ObjectType()
export class SubscriptionMutationResolver {
    @Field((type) => String, {
        description:
            'Subscribes to a channel & returns "error" or "subscribed" or "incorrect-password" or "your-channel" or "already-subbed".',
    })
    public async subscribe(
        @Arg('userId', (type) => String) userId: string,
        @Arg('channelId', (type) => String) channelId: string,
        @Arg('password', { nullable: true }) password?: string
    ) {
        try {
            const channel = await ChannelModel.findById(channelId);
            if (channel) {
                const sub = await SubscriptionModel.findOne({
                    userId,
                    channel: channel._id,
                    unsubscribedAt: { $exists: false },
                });
                if (sub) {
                    return 'already-subbed';
                }

                const notify = async () => {
                    const subtitle = 'You have been added to the course.';
                    const title = channel.name + ' - Subscribed!';
                    const messages: any[] = [];
                    const subscribersAdded = await UserModel.find({ _id: userId });
                    const activity: any[] = [];
                    subscribersAdded.map((sub) => {
                        const notificationIds = sub.notificationId.split('-BREAK-');
                        notificationIds.map((notifId: any) => {
                            if (!Expo.isExpoPushToken(notifId)) {
                                return;
                            }
                            messages.push({
                                to: notifId,
                                sound: 'default',
                                subtitle: subtitle,
                                title: title,
                                body: '',
                                data: { userId: sub._id },
                            });
                        });
                        activity.push({
                            userId: sub._id,
                            subtitle,
                            title: 'Subscribed',
                            status: 'unread',
                            date: new Date(),
                            channelId: channel._id,
                            target: 'CHANNEL_SUBSCRIBED',
                        });
                    });
                    await ActivityModel.insertMany(activity);
                    const oneSignalClient = new OneSignal.Client(
                        '78cd253e-262d-4517-a710-8719abf3ee55',
                        'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
                    );
                    const notification = {
                        contents: {
                            en: title,
                        },
                        include_external_user_ids: [userId],
                    };
                    const notificationService = new Expo();
                    await oneSignalClient.createNotification(notification);
                    let chunks = notificationService.chunkPushNotifications(messages);
                    for (let chunk of chunks) {
                        try {
                            await notificationService.sendPushNotificationsAsync(chunk);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                };

                if (channel.password && channel.password !== '') {
                    if (password === undefined || password === null || password === '') {
                        return 'incorrect-password';
                    }
                    // Private
                    if (channel.password.toString().trim() === password.toString().trim()) {
                        // check org
                        const owner = await UserModel.findById(channel.createdBy);
                        if (owner && owner.schoolId && owner.schoolId !== '') {
                            const u = await UserModel.findById(userId);
                            if (
                                u &&
                                (!u.schoolId || u.schoolId.toString().trim() !== owner.schoolId.toString().trim())
                            ) {
                                // not same school
                                return 'error';
                            }
                        }

                        // Correct password - subscribed!

                        const channelCues = await CueModel.find({
                            channelId: channel._id,
                            limitedShares: { $ne: true },
                        });

                        channelCues.map(async (cue: any) => {
                            // Check if modification already exist
                            const existingMod = await ModificationsModel.findOne({
                                cueId: cue._id,
                                userId,
                            });

                            // Check if existing mod exist

                            if (!existingMod) {
                                const cueObject = cue.toObject();
                                const duplicate = { ...cueObject };
                                delete duplicate._id;
                                delete duplicate.deletedAt;
                                delete duplicate.__v;
                                duplicate.cueId = cue._id;
                                duplicate.cue = '';
                                duplicate.userId = userId;
                                duplicate.score = 0;
                                duplicate.graded = false;
                                const u = await ModificationsModel.create(duplicate);
                            }
                        });

                        const threads = await ThreadModel.find({
                            channelId: channel._id,
                            isPrivate: false,
                        });

                        threads.map(async (t) => {
                            const thread = t.toObject();

                            // check existing thread status model
                            const existingStatus = ThreadStatusModel.findOne({
                                userId,
                                channelId: channel._id,
                                cueId: thread.cueId ? thread.cueId : null,
                                threadId: thread.parentId ? thread.parentId : thread._id,
                            });

                            if (!existingStatus) {
                                await ThreadStatusModel.create({
                                    userId,
                                    channelId: channel._id,
                                    cueId: thread.cueId ? thread.cueId : null,
                                    threadId: thread.parentId ? thread.parentId : thread._id,
                                });
                            }
                        });

                        // Clear any old subscriptions with kc = true
                        await SubscriptionModel.updateMany(
                            {
                                userId,
                                channelId: channel._id,
                                unsubscribedAt: { $exists: true },
                            },
                            {
                                keepContent: false,
                            }
                        );

                        // subscribe
                        await SubscriptionModel.create({
                            userId,
                            channelId: channel._id,
                        });

                        // Check if channel owner, if yes then update creatorUnsubscribed: true
                        if (channel.createdBy.toString().trim() === userId.toString().trim()) {
                            await ChannelModel.updateOne(
                                {
                                    _id: channel._id,
                                },
                                {
                                    creatorUnsubscribed: false,
                                }
                            );
                        }

                        // notify
                        notify();

                        return 'subscribed';
                    } else {
                        // Incorrect password
                        return 'incorrect-password';
                    }
                } else {
                    // Public
                    const owner = await UserModel.findById(channel.createdBy);
                    if (owner && owner.schoolId && owner.schoolId !== '') {
                        const u = await UserModel.findById(userId);
                        if (u && (!u.schoolId || u.schoolId.toString().trim() !== owner.schoolId.toString().trim())) {
                            // not same school
                            return 'error';
                        }
                    }

                    const channelCues = await CueModel.find({ channelId: channel._id, limitedShares: { $ne: true } });

                    channelCues.map(async (cue: any) => {
                        // Check if modification already exist
                        const existingMod = await ModificationsModel.findOne({
                            cueId: cue._id,
                            userId,
                        });

                        // Check if existing mod exist
                        if (!existingMod) {
                            const cueObject = cue.toObject();
                            const duplicate = { ...cueObject };
                            delete duplicate._id;
                            delete duplicate.deletedAt;
                            delete duplicate.__v;
                            duplicate.cueId = cue._id;
                            duplicate.cue = '';
                            duplicate.userId = userId;
                            duplicate.score = 0;
                            duplicate.graded = false;
                            const u = await ModificationsModel.create(duplicate);
                        }
                    });

                    const threads = await ThreadModel.find({
                        channelId: channel._id,
                        isPrivate: false,
                    });

                    threads.map(async (t) => {
                        const thread = t.toObject();

                        // check existing thread status model
                        const existingStatus = ThreadStatusModel.findOne({
                            userId,
                            channelId: channel._id,
                            cueId: thread.cueId ? thread.cueId : null,
                            threadId: thread.parentId ? thread.parentId : thread._id,
                        });

                        if (!existingStatus) {
                            await ThreadStatusModel.create({
                                userId,
                                channelId: channel._id,
                                cueId: thread.cueId ? thread.cueId : null,
                                threadId: thread.parentId ? thread.parentId : thread._id,
                            });
                        }
                    });

                    // Clear any old subscriptions with kc = true
                    await SubscriptionModel.updateMany(
                        {
                            userId,
                            channelId: channel._id,
                            unsubscribedAt: { $exists: true },
                        },
                        {
                            keepContent: false,
                        }
                    );

                    await SubscriptionModel.create({
                        userId,
                        channelId: channel._id,
                    });
                    // Check if channel owner, if yes then update creatorUnsubscribed: true
                    if (channel.createdBy.toString().trim() === userId.toString().trim()) {
                        await ChannelModel.updateOne(
                            {
                                _id: channel._id,
                            },
                            {
                                creatorUnsubscribed: false,
                            }
                        );
                    }

                    notify();
                    return 'subscribed';
                }
            } else {
                // Channel does not exist
                return 'error';
            }
        } catch (e) {
            // Something went wrong
            return 'error';
        }
    }

    @Field((type) => Boolean, {
        description: 'Unsubscribes from channel',
    })
    public async unsubscribe(
        @Arg('userId', (type) => String) userId: string,
        @Arg('channelId', (type) => String) channelId: string,
        @Arg('keepContent', (type) => Boolean) keepContent: boolean
    ) {
        try {
            const c = await ChannelModel.findById(channelId);
            if (c) {
                const channel = c.toObject();
                let subObject = await SubscriptionModel.findOne({
                    userId,
                    channelId,
                    unsubscribedAt: { $exists: false },
                });

                if (!subObject) {
                    return false;
                }

                // otherwise unsub
                await SubscriptionModel.updateOne(
                    {
                        _id: subObject._id,
                    },
                    {
                        unsubscribedAt: new Date(),
                        keepContent,
                    }
                );

                // Check if user is Channel owner
                const channelObj = await ChannelModel.findById(channelId);

                // If user is channel creator, update creatorUnsubscribed: true
                if (channelObj && channelObj.createdBy.toString().trim() === userId.toString().trim()) {
                    await ChannelModel.updateOne(
                        {
                            _id: channelId,
                        },
                        {
                            creatorUnsubscribed: true,
                        }
                    );
                }

                // Remove all activity associated with this user and channel
                await ActivityModel.deleteMany({
                    userId,
                    channelId,
                    target: { $ne: 'CHANNEL_UNSUBSCRIBED' },
                });

                const subtitle = 'You have been removed from the course.';
                const title = channel.name + ' - Unsubscribed!';
                const messages: any[] = [];
                const subscribersAdded = await UserModel.find({ _id: userId });
                const activity: any[] = [];
                subscribersAdded.map((sub) => {
                    activity.push({
                        userId: sub._id,
                        subtitle,
                        title: 'Unsubscribed',
                        status: 'unread',
                        date: new Date(),
                        channelId: channel._id,
                        target: 'CHANNEL_UNSUBSCRIBED',
                    });
                    const notificationIds = sub.notificationId.split('-BREAK-');
                    notificationIds.map((notifId: any) => {
                        if (!Expo.isExpoPushToken(notifId)) {
                            return;
                        }
                        messages.push({
                            to: notifId,
                            sound: 'default',
                            subtitle: subtitle,
                            title: title,
                            body: '',
                            data: { userId: sub._id },
                        });
                    });
                });
                const createdUnsubscribeActivity = await ActivityModel.insertMany(activity);
                const oneSignalClient = new OneSignal.Client(
                    '78cd253e-262d-4517-a710-8719abf3ee55',
                    'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
                );
                const notification = {
                    contents: {
                        en: title,
                    },
                    include_external_user_ids: [userId],
                };
                const notificationService = new Expo();
                await oneSignalClient.createNotification(notification);
                let chunks = notificationService.chunkPushNotifications(messages);
                for (let chunk of chunks) {
                    try {
                        await notificationService.sendPushNotificationsAsync(chunk);
                    } catch (e) {
                        console.error(e);
                    }
                }
                return true;
            } else {
                return false;
            }
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Makes user active again (active by default)',
    })
    public async makeActive(
        @Arg('userId', (type) => String) userId: string,
        @Arg('channelId', (type) => String) channelId: string
    ) {
        try {
            const sub = await SubscriptionModel.findOne({
                userId,
                channelId,
                unsubscribedAt: { $exists: false },
            });
            if (sub) {
                const subscription = sub.toObject();
                if (subscription.inactive !== true) {
                    return false;
                } else {
                    await SubscriptionModel.updateOne({ _id: subscription._id }, { inactive: false });
                    return true;
                }
            } else {
                return false;
            }
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Makes user inactive',
    })
    public async makeInactive(
        @Arg('userId', (type) => String) userId: string,
        @Arg('channelId', (type) => String) channelId: string
    ) {
        try {
            const sub = await SubscriptionModel.findOne({
                userId,
                channelId,
                unsubscribedAt: { $exists: false },
            });
            if (sub) {
                const subscription = sub.toObject();
                if (subscription.inactive === true) {
                    return false;
                } else {
                    await SubscriptionModel.updateOne({ _id: subscription._id }, { inactive: true });
                    return true;
                }
            } else {
                return false;
            }
        } catch (e) {
            console.log(e);
            return false;
        }
    }
}
