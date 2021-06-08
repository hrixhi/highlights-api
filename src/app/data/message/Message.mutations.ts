import { htmlStringParser } from '@helper/HTMLParser';
import Expo from 'expo-server-sdk';
import { Arg, Field, ObjectType } from 'type-graphql';
import { GroupModel } from '../group/mongo/Group.model';
import { MessageStatusModel } from '../message-status/mongo/message-status.model';
import { UserModel } from '../user/mongo/User.model';
import { MessageModel } from './mongo/Message.model';

/**
 * Message Mutation Endpoints
 */
@ObjectType()
export class MessageMutationResolver {

    @Field(type => Boolean, {
        description: 'Used to create a message.'
    })
    public async create(
        @Arg("users", type => [String])
        users: string[],
        @Arg("message", type => String)
        message: string,
        @Arg("channelId", type => String)
        channelId: string,
    ) {
        try {
            if (users.length === 0) {
                return false
            }
            const groupDoc = await GroupModel.findOne({ users: { $all: users } })
            let groupId = ''
            if (groupDoc) {
                groupId = groupDoc._id
            } else {
                const newGroup = await GroupModel.create({
                    users,
                    channelId
                })
                groupId = newGroup._id
            }
            await MessageModel.create({
                groupId,
                message,
                sentBy: users[0],
                sentAt: new Date()
            })
            users.map(async (u, i) => {
                if (i === 0) {
                    return;
                }
                await MessageStatusModel.create({
                    groupId,
                    userId: users[i],
                    channelId
                })
            })
            const userIds: any[] = []
            const messages: any[] = []
            const notificationService = new Expo()
            users.map(u => {
                userIds.push(u)
            })
            const userArr = await UserModel.find({ _id: { $in: userIds } })
            let senderName = ''
            userArr.map((sub: any, i: any) => {
                if (i === 0) {
                    senderName = sub.fullName;
                    return
                }
                const notificationIds = sub.notificationId.split('-')
                notificationIds.map((notifId: any) => {
                    if (!Expo.isExpoPushToken(notifId)) {
                        return
                    }
                    const { title, subtitle: body } = htmlStringParser(message)
                    messages.push({
                        to: notifId,
                        sound: 'default',
                        title: senderName,
                        subtitle: title,
                        data: { userId: sub._id },
                    })
                })
            })
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
            return false
        }
    }

}
