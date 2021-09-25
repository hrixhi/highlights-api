import { htmlStringParser } from "@helper/HTMLParser";
import Expo from "expo-server-sdk";
import { Arg, Field, ObjectType } from "type-graphql";
import { GroupModel } from "../group/mongo/Group.model";
import { MessageStatusModel } from "../message-status/mongo/message-status.model";
import { UserModel } from "../user/mongo/User.model";
import { MessageModel } from "./mongo/Message.model";

import * as OneSignal from "onesignal-node";
import { ChannelModel } from "../channel/mongo/Channel.model";

/**
 * Message Mutation Endpoints
 */
@ObjectType()
export class MessageMutationResolver {
    @Field(type => Boolean, {
        description: "Used to create a message."
    })
    public async create(
        @Arg("users", type => [String])
        users: string[],
        @Arg("message", type => String)
        message: string,
        @Arg("channelId", type => String)
        channelId: string,
        @Arg("userId", type => String)
        userId: string
    ) {
        try {
            if (users.length === 0) {
                return false;
            }
            const groupDoc = await GroupModel.findOne({
                users: { $all: users }
            });
            let groupId = "";
            if (groupDoc) {
                groupId = groupDoc._id;
            } else {
                const newGroup = await GroupModel.create({
                    users,
                    channelId
                });
                groupId = newGroup._id;
            }
            await MessageModel.create({
                groupId,
                message,
                sentBy: userId,
                sentAt: new Date()
            });
            users.map(async (u, i) => {
                if (i === 0) {
                    return;
                }
                await MessageStatusModel.create({
                    groupId,
                    userId: users[i],
                    channelId
                });
            });
            const userIds: any[] = [];
            const messages: any[] = [];
            const notificationService = new Expo();

            users.map(u => {
                userIds.push(u);
            });

            const userArr = await UserModel.find({ _id: { $in: userIds } });

            const sentByUser = await UserModel.findById(userId);

            const fetchMessageChannel = await ChannelModel.findById(channelId);

            let senderName = "";
            userArr.map((sub: any, i: any) => {
                if (i === 0) {
                    senderName = sub.fullName;
                    return;
                }
                const notificationIds = sub.notificationId.split("-BREAK-");
                notificationIds.map((notifId: any) => {
                    if (!Expo.isExpoPushToken(notifId)) {
                        return;
                    }
                    const { title, subtitle: body } = htmlStringParser(message);
                    messages.push({
                        to: notifId,
                        sound: "default",
                        title:
                            fetchMessageChannel && sentByUser
                                ? `${fetchMessageChannel.name}- ` +
                                "New Message from " +
                                sentByUser.fullName
                                : "New message",
                        subtitle: title,
                        data: { userId: sub._id }
                    });
                });
            });

            // Web notifications

            const { title, subtitle: body } = htmlStringParser(message);

            const oneSignalClient = new OneSignal.Client(
                "51db5230-f2f3-491a-a5b9-e4fba0f23c76",
                "Yjg4NTYxODEtNDBiOS00NDU5LTk3NDItZjE3ZmIzZTVhMDBh"
            );

            const notification = {
                contents: {
                    en:
                        fetchMessageChannel && sentByUser
                            ? `${fetchMessageChannel.name}- ` +
                            sentByUser.fullName +
                            ": " +
                            title
                            : "New message"
                },
                include_external_user_ids: userIds
            };

            const response = await oneSignalClient.createNotification(
                notification
            );

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

    @Field(type => Boolean, {
        description: "Used to create a message."
    })
    public async createDirect(
        @Arg("users", type => [String])
        users: string[],
        @Arg("message", type => String)
        message: string,
        @Arg("userId", type => String)
        userId: string,
        @Arg("channelId", type => String, { nullable: true })
        channelId?: string,
        @Arg("groupId", type => String, { nullable: true })
        groupId?: string,
        @Arg("groupName", type => String, { nullable: true })
        groupName?: string,
        @Arg("groupImage", type => String, { nullable: true })
        groupImage?: string,
    ) {
        try {
            if (users.length === 0) {
                return false;
            }

            let id = groupId

            // Create new group if no groupId passed in and the number of users is more than 2
            if (!groupId && users.length > 2) {

                const newGroup = await GroupModel.create({
                    users,
                    channelId,
                    name: groupName,
                    image: groupImage,
                    createdBy: userId
                });
                id = newGroup._id;

            } else {
                // Existing chats or groups
                let groupDoc : any = {};

                // if (groupId) {
                groupDoc = await GroupModel.findOne({
                    _id: groupId
                })
                // } else {
                //     groupDoc = await GroupModel.findOne({
                //         users: { $all: users, $size: users.length }
                //     });
                // }

                id = groupDoc._id;
                
            }

            await MessageModel.create({
                groupId: id,
                message,
                sentBy: userId,
                sentAt: new Date()
            });
            users.map(async (u, i) => {
                if (i === 0) {
                    return;
                }
                await MessageStatusModel.create({
                    groupId: id,
                    userId: users[i],
                    channelId
                });
            });
            let userIds: any[] = [];
            const messages: any[] = [];
            const notificationService = new Expo();

            users.map(u => {
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

                const notificationIds = sub.notificationId.split("-BREAK-");
                notificationIds.map((notifId: any) => {
                    if (!Expo.isExpoPushToken(notifId)) {
                        return;
                    }
                    const { title, subtitle: body } = htmlStringParser(message);
                    messages.push({
                        to: notifId,
                        sound: "default",
                        title:
                            sentByUser ?
                                "New Message from " +
                                sentByUser.fullName
                                : "New message",
                        subtitle: title,
                        data: { userId: sub._id }
                    });
                });

            });

            // Web notifications

            const { title, subtitle: body } = htmlStringParser(message);

            const oneSignalClient = new OneSignal.Client(
                "51db5230-f2f3-491a-a5b9-e4fba0f23c76",
                "Yjg4NTYxODEtNDBiOS00NDU5LTk3NDItZjE3ZmIzZTVhMDBh"
            );

            // Remove sent by from notifications
            userIds = userIds.filter((id) => id !== userId)

            const notification = {
                contents: {
                    en:
                        sentByUser
                            ? sentByUser.fullName +
                            ": " +
                            title
                            : "New message"
                },
                include_external_user_ids: userIds
            };

            const response = await oneSignalClient.createNotification(
                notification
            );

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

    @Field(type => Boolean, {
        description: "Used to create a message."
    })
    public async updateGroup(
        @Arg("groupId", type => String)
        groupId: string,
        @Arg("groupName", type => String)
        groupName: string,
        @Arg("groupImage", type => String, { nullable: true })
        groupImage?: string,
    ) {

        const update = await GroupModel.updateOne({
            _id: groupId
        }, {
            $set: {
                name: groupName,
                image: groupImage
            }
        })

        return update.nModified > 0;
    }
}
