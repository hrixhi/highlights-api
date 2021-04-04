import { Arg, Field, ObjectType } from 'type-graphql';
import { DateModel } from '../dates/mongo/dates.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
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
            const date = await DateModel.findOne({
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
