import { Arg, Field, ObjectType } from 'type-graphql';
import { DateModel } from '../dates/mongo/dates.model';
import { EventObject } from '../dates/types/Date.type';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { AttendanceModel } from './mongo/attendance.model';
import { AttendanceObject } from './types/Attendance.type';
import { ChannelAttendanceObject } from './types/ChannelAttendance.type';
import { UserModel } from '../user/mongo/User.model';
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

    @Field(type => [ChannelAttendanceObject], {
        description: "Returns a list of Attendances for  past dates",
        nullable: true
    })
    public async getAttendancesForChannel(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {

            const channelSubscriptions: any[] = await SubscriptionModel.find({
                channelId,
                "deletedAt": null,
            })

            const userIds: string[] = channelSubscriptions.map(sub => sub.userId)
            
            const channelUsers: any[] = await UserModel.find({ _id: { $in: userIds }})

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