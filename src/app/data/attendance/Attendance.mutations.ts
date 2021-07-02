import { htmlStringParser } from '@helper/HTMLParser';
import Expo from 'expo-server-sdk';
import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { DateModel } from '../dates/mongo/dates.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { UserModel } from '../user/mongo/User.model';
import { AttendanceModel } from './mongo/attendance.model';
import * as OneSignal from 'onesignal-node';  

/**
 * Attendance Mutation Endpoints
 */
@ObjectType()
export class AttendanceMutationResolver {

    @Field(type => Boolean, {
        description: 'Used when you want to update unread messages count.'
    })
    public async create(
        @Arg('channelId', type => String) channelId: string,
        @Arg('start', type => String) start: string,
        @Arg('end', type => String) end: string
    ) {
        try {
            await DateModel.create({
                start: new Date(start),
                end: new Date(end),
                title: 'Scheduled Call',
                scheduledMeetingForChannelId: channelId
            })
            const messages: any[] = []
            const userIds: any[] = []

            const subscriptions = await SubscriptionModel.find({
                $and: [{ channelId }, { unsubscribedAt: { $exists: false } }]
            })
            subscriptions.map((s) => {
                userIds.push(s.userId)
            })
            const channel: any = await ChannelModel.findById(channelId)
            const users: any[] = await UserModel.find({ _id: { $in: userIds } })

            // Web notifications

			const oneSignalClient = new OneSignal.Client('51db5230-f2f3-491a-a5b9-e4fba0f23c76', 'Yjg4NTYxODEtNDBiOS00NDU5LTk3NDItZjE3ZmIzZTVhMDBh')


			const notification = {
				contents: {
					'en': `${channel.name}` + ' - New Meeting Scheduled'
				},
                include_external_user_ids:  userIds				
            }

			const response = await oneSignalClient.createNotification(notification)

            users.map((sub) => {
                const notificationIds = sub.notificationId.split('-BREAK-')
                notificationIds.map((notifId: any) => {
                    if (!Expo.isExpoPushToken(notifId)) {
                        return
                    }
                    messages.push({
                        to: notifId,
                        sound: 'default',
                        subtitle: 'Your instructor has scheduled a new meeting.',
                        title: channel.name + ' - New Meeting Scheduled',
                        data: { userId: sub._id },
                    })
                })
            })
            const notificationService = new Expo()
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

    @Field(type => Boolean, {
        description: 'Used to mark as class start.'
    })
    public async markAttendance(
        @Arg('userId', type => String) userId: string,
        @Arg('channelId', type => String) channelId: string
    ) {
        try {
            // What if user joins 2 minutes before start time.... to do
            // Subtract 10 minutes from start to capture attendance 
            const current = new Date()
            // const minus10 = new Date(current.getTime() - (1000 * 60 * 10))
            const plus10 = new Date(current.getTime() + (1000 * 60 * 10))

            // If meeting from 10:00 to 11:00
            // Try to join at 9:55 then look for start date less than 10:05, therefore captured

            const date = await DateModel.findOne({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: channelId,
                start: { $lte: plus10 },
                end: { $gte: current }
            })
            if (date) {
                const att = await AttendanceModel.findOne({
                    userId,
                    dateId: date._id,
                    channelId
                })
                if (!att) {
                    await AttendanceModel.create({
                        userId,
                        dateId: date._id,
                        joinedAt: new Date(),
                        channelId
                    })
                }
            }
            return true
        } catch (e) {
            return false
        }
    }

}
