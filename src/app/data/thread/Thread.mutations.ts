import { htmlStringParser } from "@helper/HTMLParser";
import Expo from "expo-server-sdk";
import { Arg, Field, ObjectType } from "type-graphql";
import { ChannelModel } from "../channel/mongo/Channel.model";
import { SubscriptionModel } from "../subscription/mongo/Subscription.model";
import { ThreadStatusModel } from "../thread-status/mongo/thread-status.model";
import { UserModel } from "../user/mongo/User.model";
import { ThreadModel } from "./mongo/Thread.model";

import * as OneSignal from "onesignal-node";
import { CueModel } from "../cue/mongo/Cue.model";
import { ActivityModel } from "../activity/mongo/activity.model";

/**
 * Thread Mutation Endpoints
 */
@ObjectType()
export class ThreadMutationResolver {
    @Field(type => Boolean, {
        description: "Creates new message"
    })
    public async writeMessage(
        @Arg("message", type => String) message: string,
        @Arg("userId", type => String) userId: string,
        @Arg("channelId", type => String) channelId: string,
        @Arg("isPrivate", type => Boolean) isPrivate: boolean,
        @Arg("anonymous", type => Boolean) anonymous: boolean,
        @Arg("parentId", type => String) parentId: string,
        @Arg("cueId", type => String) cueId: string,
        @Arg("category", { nullable: true }) category?: string
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
                cueId: cueId === "NULL" ? null : cueId,
                parentId: parentId === "INIT" ? null : parentId
            });
            if (!isPrivate) {
                // Public thread
                // Create badge for everyone in the channel
                const subscribers = await SubscriptionModel.find({
                    channelId,
                    unsubscribedAt: { $exists: false }
                });
                subscribers.map(async s => {
                    const subscriber = s.toObject();
                    if (
                        s.userId.toString().trim() === userId.toString().trim()
                    ) {
                        // sender does not need notif
                        return;
                    }
                    await ThreadStatusModel.create({
                        cueId: cueId === "NULL" ? undefined : cueId,
                        userId: subscriber.userId,
                        threadId: parentId === "INIT" ? thread._id : parentId,
                        channelId
                    });
                });

                let cueTitle = "";

                if (cueId !== "NULL") {
                    const fetchCue = await CueModel.findById(cueId);

                    if (!fetchCue) {
                        return;
                    }

                    const { title } = htmlStringParser(fetchCue.cue)

                    cueTitle = title;

                }

                const userIds: any[] = [];
                const messages: any[] = [];
                const notificationService = new Expo();
                subscribers.map(u => {
                    userIds.push(u.userId);
                });
                const channel: any = await ChannelModel.findById(channelId);
                const users = await UserModel.find({ _id: { $in: userIds } });
                const activity: any[] = []
                const { title, subtitle: body } = htmlStringParser(
                    message
                );
                users.map(sub => {
                    const notificationIds = sub.notificationId.split("-BREAK-");
                    notificationIds.map((notifId: any) => {
                        if (!Expo.isExpoPushToken(notifId)) {
                            return;
                        }

                        messages.push({
                            to: notifId,
                            sound: "default",
                            title:
                                channel.name + (cueId === "NULL" ? "- New Discussion " : "- New Q&A ") +
                                (parentId
                                    ? "Post"
                                    : "Reply"),
                            subtitle: title,
                            body,
                            data: { userId: sub._id }
                        });
                    });
                    activity.push({
                        userId: sub._id,
                        subtitle: title,
                        title: (cueId === "NULL" ? "New Discussion " : "New Q&A ") +
                            (parentId
                                ? "Post"
                                : "Reply"),
                        status: 'unread',
                        date: new Date(),
                        channelId: channel._id,
                        cueId: cueId === "NULL" ? null : cueId,
                        target: cueId === "NULL" ? "DISCUSSION" : "Q&A"
                    })
                });
                await ActivityModel.insertMany(activity)

                // Web notifications
                const oneSignalClient = new OneSignal.Client(
                    "51db5230-f2f3-491a-a5b9-e4fba0f23c76",
                    "Yjg4NTYxODEtNDBiOS00NDU5LTk3NDItZjE3ZmIzZTVhMDBh"
                );

                const notification = {
                    contents: {
                        en:
                        channel.name + (cueId === "NULL" ? "- New Discussion " : "- New Q&A ") +
                        (parentId
                            ? "Post"
                            : "Reply") +
                            ": " +
                            title
                    },
                    include_external_user_ids: userIds
                };

                const response = await oneSignalClient.createNotification(
                    notification
                );

                let chunks = notificationService.chunkPushNotifications(
                    messages
                );
                for (let chunk of chunks) {
                    try {
                        await notificationService.sendPushNotificationsAsync(
                            chunk
                        );
                    } catch (e) {
                        console.error(e);
                    }
                }
            } else {
                // Private thread
                // Create badges for the owner only
                const channel = await ChannelModel.findById(channelId);
                if (channel) {
                    const obj = channel.toObject();
                    await ThreadStatusModel.create({
                        cueId: cueId === "NULL" ? undefined : cueId,
                        userId: obj.createdBy,
                        threadId: parentId === "INIT" ? thread._id : parentId,
                        channelId
                    });
                    // SEND MESSAGE TO OWNER
                    const user: any = await UserModel.findById(obj.createdBy);
                    const messages: any[] = [];
                    const notificationService = new Expo();

                    const notificationIds = user.notificationId.split(
                        "-BREAK-"
                    );
                    const { title, subtitle: body } = htmlStringParser(
                        message
                    );
                    notificationIds.map((notifId: any) => {
                        if (!Expo.isExpoPushToken(notifId)) {
                            return;
                        }

                        messages.push({
                            to: notifId,
                            sound: "default",
                            subtitle: title,
                            title:
                            channel.name + (cueId === "NULL" ? "- New Discussion " : "- New Q&A ") +
                            (parentId
                                ? "Post"
                                : "Reply"),
                            data: { userId: user._id }
                        });
                    });
                    const activity = {
                        userId,
                        subtitle: title,
                        title: 'Private Thread',
                        status: 'unread',
                        date: new Date(),
                        channelId,
                        cueId: cueId === "NULL" ? null : cueId,
                        target: cueId === "NULL" ? "DISCUSSION" : "Q&A"
                    }
                    await ActivityModel.create(activity)

                    let chunks = notificationService.chunkPushNotifications(
                        messages
                    );
                    for (let chunk of chunks) {
                        try {
                            await notificationService.sendPushNotificationsAsync(
                                chunk
                            );
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    @Field(type => Boolean, {
        description: "deletes thread(s)"
    })
    public async delete(@Arg("threadId", type => String) threadId: string) {
        try {
            const t = await ThreadModel.findById(threadId);
            if (t) {
                const thread = t.toObject();
                if (thread.parentId) {
                    // if not parent only delete that one
                    await ThreadModel.deleteOne({ _id: threadId });
                    return true;
                } else {
                    // If parent, delete children also
                    await ThreadModel.deleteMany({ parentId: threadId });
                    await ThreadModel.deleteOne({ _id: threadId });
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
