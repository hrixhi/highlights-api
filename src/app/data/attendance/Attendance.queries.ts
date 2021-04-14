import { Arg, Field, ObjectType } from 'type-graphql';
import { DateModel } from '../dates/mongo/dates.model';
import { EventObject } from '../dates/types/Date.type';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { AttendanceModel } from './mongo/attendance.model';
import { AttendanceObject } from './types/Attendance.type';
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
        description: "Returns list of upcoming dates per user for all channels.",
        nullable: true
    })
    public async getAllUpcomingDates(
        @Arg("userId", type => String)
        userId: string
    ) {
        try {
            const channelIds: any[] = []
            const activeSubs = await SubscriptionModel.find({
                userId,
                unsubscribedAt: { $exists: false }
            })
            activeSubs.map((s: any) => {
                const sub = s.toObject();
                channelIds.push(sub.channelId);
            })
            return await DateModel.find({
                scheduledMeetingForChannelId: { $in: channelIds },
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

}