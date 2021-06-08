import { htmlStringParser } from '@helper/HTMLParser';
import Expo from 'expo-server-sdk';
import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { DateModel } from '../dates/mongo/dates.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { UserModel } from '../user/mongo/User.model';
import { AttendanceModel } from './mongo/attendance.model';

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
            users.map((sub) => {
                const notificationIds = sub.notificationId.split('-')
                notificationIds.map((notifId: any) => {
                    if (!Expo.isExpoPushToken(notifId)) {
                        return
                    }
                    messages.push({
                        to: notifId,
                        sound: 'default',
                        subtitle: 'New Meeting Scheduled!',
                        title: channel.name,
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
            const date = await DateModel.findOne({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: channelId,
                start: { $lte: new Date() },
                end: { $gte: new Date() }
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
