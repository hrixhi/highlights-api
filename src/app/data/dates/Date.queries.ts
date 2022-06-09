import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { EventObject } from './types/Date.type';
import { DateModel } from './mongo/dates.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { GroupModel } from '../group/mongo/Group.model';
import { UserModel } from '../user/mongo/User.model';

/**
 * Date Query Endpoints
 */
@ObjectType()
export class DateQueryResolver {
    @Field((type) => [EventObject], {
        description: 'Returns list of date objects.',
        nullable: true,
    })
    public async getPastDates(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            const subscriptions: any[] = await SubscriptionModel.find({ userId, unsubscribedAt: { $exists: false } });
            const channelIdInputs: any[] = [];
            subscriptions.map((s) => {
                const sub = s.toObject();
                channelIdInputs.push(sub.channelId);
            });
            // const channels = await ChannelModel.find({ _id: { $in: channelIdInputs } })
            // only return past dates
            return await DateModel.find({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: { $in: channelIdInputs },
                end: { $lte: new Date() },
            });
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => [EventObject], {
        description: 'Returns list of date objects created by a user.',
        nullable: true,
    })
    public async getCalendar(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            const dates: any[] = [];
            const subscriptions: any[] = await SubscriptionModel.find({ userId, unsubscribedAt: { $exists: false } });
            const channelIdInputs: any[] = [];
            subscriptions.map((s) => {
                const sub = s.toObject();
                channelIdInputs.push(sub.channelId);
            });
            // const channels = await ChannelModel.find({ _id: { $in: channelIdInputs } })
            const cues = await CueModel.find({ channelId: { $in: channelIdInputs }, submission: true });
            // channels.map((c) => {
            //     const channel = c.toObject()
            //     channelNames[channel._id] = channel.name
            // })
            cues.map((c) => {
                const cue = c.toObject();
                dates.push({
                    dateId: 'channel',
                    title: cue.cue,
                    start: cue.deadline,
                    end: cue.deadline,
                    scheduledMeetingForChannelId: cue.channelId,
                    meeting: false,
                    cueId: cue._id,
                });
            });
            // Personal events
            const addedDates: any[] = await DateModel.find({
                userId,
                isNonChannelMeeting: { $ne: true },
                scheduledMeetingForChannelId: { $eq: undefined },
            });
            addedDates.map((d) => {
                const date = d.toObject();
                dates.push({
                    dateId: date._id,
                    title: date.title,
                    description: date.description,
                    start: date.start,
                    end: date.end,
                    meeting: false,
                    cueId: '',
                    recurringId: date.recurringId,
                });
            });
            const scheduledMeetings: any[] = await DateModel.find({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: { $in: channelIdInputs },
            });
            scheduledMeetings.map((d: any) => {
                const date = d.toObject();
                dates.push({
                    ...date,
                    title: date.title,
                    description: date.description,
                    dateId: date._id,
                    meeting: true,
                    cueId: '',
                    zoomMeetingId: date.zoomMeetingId,
                    zoomStartUrl: date.zoomStartUrl,
                    zoomJoinUrl: date.zoomJoinUrl,
                    zoomMeetingScheduledBy: date.zoomMeetingScheduledBy,
                });
            });
            const nonMeetingChannelEvents: any[] = await DateModel.find({
                scheduledMeetingForChannelId: { $in: channelIdInputs },
                isNonMeetingChannelEvent: true,
            });
            nonMeetingChannelEvents.map((d: any) => {
                const date = d.toObject();
                console.log('Date', date);
                dates.push({
                    ...date,
                    // title: date.title,
                    // description: date.description,
                    dateId: 'channel',
                    meeting: false,
                    cueId: '',
                });
            });

            const allGroups = await GroupModel.find({
                users: userId,
            });

            const groupIdInputs: any[] = [];
            allGroups.map((g) => {
                const grp = g.toObject();
                groupIdInputs.push(grp._id);
            });

            const nonChannelMeetings: any[] = await DateModel.find({
                isNonChannelMeeting: true,
                nonChannelGroupId: { $in: groupIdInputs },
                end: { $gte: new Date() },
                scheduledMeetingForChannelId: { $eq: undefined },
            });

            nonChannelMeetings.map((d: any) => {
                const date = d.toObject();
                dates.push({
                    ...date,
                    title: date.title,
                    description: date.description,
                    dateId: date._id,
                    meeting: true,
                    cueId: '',
                    zoomMeetingId: date.zoomMeetingId,
                    zoomStartUrl: date.zoomStartUrl,
                    zoomJoinUrl: date.zoomJoinUrl,
                    zoomMeetingScheduledBy: date.zoomMeetingScheduledBy,
                });
            });

            return dates;
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => [EventObject], {
        description: 'Returns list of date objects created by a user.',
        nullable: true,
    })
    public async getCalendarAdmin(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            let dates: any[] = [];

            // Retrieve all events created by the user
            const fetchDates = await DateModel.find({
                $or: [
                    { userId },
                    {
                        $and: [
                            { schoolId },
                            { $or: [{ shareWithAllAdmins: true }, { selectedAdmins: { $in: [userId] } }] },
                        ],
                    },
                ],
            });

            fetchDates.map((d: any) => {
                const date = d.toObject();

                dates.push({
                    ...date,
                    dateId: date._id,
                    meeting:
                        date.isNonMeetingSchoolEvent !== null && date.isNonMeetingSchoolEvent !== undefined
                            ? !date.isNonMeetingSchoolEvent
                            : false,
                });
            });

            return dates;
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }

    @Field((type) => [EventObject], {
        description: 'Returns list of date objects created by a user.',
        nullable: true,
    })
    public async getNotificationEvents(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            const dates: any[] = [];

            const subscriptions: any[] = await SubscriptionModel.find({ userId, unsubscribedAt: { $exists: false } });

            const channelIdInputs: any[] = [];

            subscriptions.map((s) => {
                const sub = s.toObject();
                channelIdInputs.push(sub.channelId);
            });

            const dateOffset = 24 * 60 * 60 * 1000; //5 days
            var twentyFourOffset = new Date();
            twentyFourOffset.setTime(twentyFourOffset.getTime() - dateOffset);

            const cues = await CueModel.find({
                channelId: { $in: channelIdInputs },
                submission: true,
                deadline: { $gt: twentyFourOffset },
            }).limit(63);

            cues.map((c) => {
                const cue = c.toObject();
                dates.push({
                    dateId: 'channel',
                    title: cue.cue,
                    start: cue.deadline,
                    end: cue.deadline,
                    scheduledMeetingForChannelId: cue.channelId,
                    meeting: false,
                    cueId: cue._id,
                });
            });

            const addedDates: any[] = await DateModel.find({ userId, start: { $gt: new Date() } }).limit(63);

            addedDates.map((d) => {
                const date = d.toObject();
                dates.push({
                    dateId: date._id,
                    title: date.title,
                    start: date.start,
                    end: date.end,
                    meeting: false,
                    cueId: '',
                });
            });

            const scheduledMeetings: any[] = await DateModel.find({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: { $in: channelIdInputs },
                end: { $gt: new Date() },
            }).limit(63);

            scheduledMeetings.map((d: any) => {
                const date = d.toObject();
                dates.push({
                    ...date,
                    title: date.title,
                    dateId: date._id,
                    meeting: true,
                    cueId: '',
                    zoomMeetingId: date.zoomMeetingId,
                    zoomStartUrl: date.zoomStartUrl,
                    zoomJoinUrl: date.zoomJoinUrl,
                    zoomMeetingScheduledBy: date.zoomMeetingScheduledBy,
                });
            });

            const nonMeetingChannelEvents: any[] = await DateModel.find({
                scheduledMeetingForChannelId: { $in: channelIdInputs },
                isNonMeetingChannelEvent: true,
                start: { $gt: new Date() },
            }).limit(63);

            nonMeetingChannelEvents.map((d: any) => {
                const date = d.toObject();
                dates.push({
                    ...date,
                    title: date.title,
                    dateId: 'channel',
                    meeting: false,
                    cueId: '',
                });
            });

            // Sort all dates and limit them by
            let sortedDates = dates.sort((a: any, b: any) => {
                return new Date(a.start) > new Date(b.start) ? 1 : -1;
            });

            const limit: any[] = sortedDates.slice(0, 64);

            return limit;
        } catch (e) {
            console.log(e);
            return [];
        }
    }
}
