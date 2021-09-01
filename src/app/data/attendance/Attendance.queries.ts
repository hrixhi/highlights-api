import { Arg, Field, ObjectType } from 'type-graphql';
import { DateModel } from '../dates/mongo/dates.model';
import { EventObject } from '../dates/types/Date.type';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { AttendanceModel } from './mongo/attendance.model';
import { AttendanceObject } from './types/Attendance.type';
import { ChannelAttendanceObject } from './types/ChannelAttendance.type';
import { UserModel } from '../user/mongo/User.model';
import { ChannelModel } from '../channel/mongo/Channel.model';
/**
 * Attendance Query Endpoints
 */
@ObjectType()
export class AttendanceQueryResolver {

    @Field(type => [EventObject], {
        description: "Returns list of upcoming dates.",
        nullable: true
    })
    public async getUpcomingDates(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {
            return await DateModel.find({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: channelId,
                end: { $gt: new Date() }
            })
        } catch (e) {
            console.log(e)
            return []
        }
    }

    @Field(type => [EventObject], {
        description: "Returns list of past dates.",
        nullable: true
    })
    public async getPastDates(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {
            const toReturn: any[] = []
            const dates = await DateModel.find({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: channelId,
                end: { $lte: new Date() }
            })
            dates.map((d: any) => {
                const date = d.toObject()
                toReturn.push({
                    ...date,
                    dateId: date._id
                })
            })
            return toReturn
        } catch (e) {
            console.log(e)
            return []
        }
    }

    @Field(type => [AttendanceObject], {
        description: "Returns list of attendances.",
        nullable: true
    })
    public async getAttendances(
        @Arg("dateId", type => String)
        dateId: string
    ) {
        try {
            return await AttendanceModel.find({
                dateId
            })
        } catch (e) {
            console.log(e)
            return []
        }
    }

    @Field(type => [AttendanceObject], {
        description: "Returns a list of Attendances for a user for all channels",
        nullable: true
    })
    public async getAttendancesByUser(
        @Arg("userId", type => String)
        userId: string
    ) {
        try {
            return await AttendanceModel.find({
                userId
            })
        } catch (e) {
            console.log(e)
            return []
        }

    }

    @Field(type => [ChannelAttendanceObject], {
        description: "Returns a list of Attendances for  past dates",
        nullable: true
    })
    public async getAttendancesForChannel(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {

            const channel: any = await ChannelModel.findById(channelId);

            let owners: any[] = [];

            if (channel) {
                owners = channel.owners ? [...channel.owners, channel.createdBy.toString()] : [channel.createdBy.toString()]
            }

            const channelSubscriptions: any[] = await SubscriptionModel.find({
                channelId,
                "deletedAt": null,
            })

            const userIds: string[] = channelSubscriptions.map(sub => sub.userId)

            const filteredUserIds: string[] = userIds.filter(userId => !owners.includes(userId.toString()))

            const channelUsers: any[] = await UserModel.find({ _id: { $in: filteredUserIds } })

            const attendanceObject: any = {}

            const attendanceData: any = await AttendanceModel.find({
                channelId
            })

            attendanceData.map((att: any) => {
                const attendance = att.toObject()
                if (attendanceObject[attendance.userId]) {
                    attendanceObject[attendance.userId].push({
                        userId: attendance.userId,
                        dateId: attendance.dateId,
                        joinedAt: attendance.joinedAt
                    })
                } else {
                    attendanceObject[attendance.userId] = [{
                        userId: attendance.userId,
                        dateId: attendance.dateId,
                        joinedAt: attendance.joinedAt
                    }]
                }
            })

            const channelAttendance: any[] = []

            channelUsers.map((u: any) => {
                const user = u.toObject()
                channelAttendance.push({
                    userId: user._id,
                    displayName: user.displayName,
                    fullName: user.fullName,
                    email: user.email && user.email !== '' ? user.email : '',
                    attendances: attendanceObject[user._id] ? attendanceObject[user._id] : []
                })
            })

            return channelAttendance
        } catch (e) {
            return []
        }

    }

}