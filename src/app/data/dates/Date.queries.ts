import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { EventObject } from './types/Date.type';
import { DateModel } from './mongo/dates.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { ChannelModel } from '../channel/mongo/Channel.model';

/**
 * Date Query Endpoints
 */
@ObjectType()
export class DateQueryResolver {
    @Field(type => [EventObject], {
        description: 'Returns list of date objects.',
        nullable: true
    })
    public async getPastDates(
        @Arg('userId', type => String)
        userId: string
    ) {
        try {
            const subscriptions: any[] = await SubscriptionModel.find({ userId, unsubscribedAt: { $exists: false } });
            const channelIdInputs: any[] = [];
            subscriptions.map(s => {
                const sub = s.toObject();
                channelIdInputs.push(sub.channelId);
            });
            // const channels = await ChannelModel.find({ _id: { $in: channelIdInputs } })
            // only return past dates
            return await DateModel.find({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: { $in: channelIdInputs },
                end: { $lte: new Date() }
            });
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field(type => [EventObject], {
        description: 'Returns list of date objects created by a user.',
        nullable: true
    })
    public async getCalendar(
        @Arg('userId', type => String)
        userId: string
    ) {
        try {
            const dates: any[] = [];
            const subscriptions: any[] = await SubscriptionModel.find({ userId, unsubscribedAt: { $exists: false } });
            const channelIdInputs: any[] = [];
            subscriptions.map(s => {
                const sub = s.toObject();
                channelIdInputs.push(sub.channelId);
            });
            // const channels = await ChannelModel.find({ _id: { $in: channelIdInputs } })
            const cues = await CueModel.find({ channelId: { $in: channelIdInputs }, submission: true });
            // channels.map((c) => {
            //     const channel = c.toObject()
            //     channelNames[channel._id] = channel.name
            // })
            cues.map(c => {
                const cue = c.toObject();
                dates.push({
                    dateId: 'channel',
                    title: cue.cue,
                    start: cue.deadline,
                    end: cue.deadline,
                    scheduledMeetingForChannelId: cue.channelId,
                    meeting: false,
                    cueId: cue._id
                });
            });
            const addedDates: any[] = await DateModel.find({ userId });
            addedDates.map(d => {
                const date = d.toObject();
                dates.push({
                    dateId: date._id,
                    title: date.title,
                    start: date.start,
                    end: date.end,
                    meeting: false,
                    cueId: ''
                });
            });
            const scheduledMeetings: any[] = await DateModel.find({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: { $in: channelIdInputs },
                end: { $gte: new Date() }
            });
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
                    zoomMeetingScheduledBy: date.zoomMeetingScheduledBy
                });
            });
            const nonMeetingChannelEvents: any[] = await DateModel.find({
                scheduledMeetingForChannelId: { $in: channelIdInputs },
                isNonMeetingChannelEvent: true
            });
            nonMeetingChannelEvents.map((d: any) => {
                const date = d.toObject();
                dates.push({
                    ...date,
                    title: date.title,
                    dateId: 'channel',
                    meeting: false,
                    cueId: ''
                });
            });
            return dates;
        } catch (e) {
            console.log(e);
            return [];
        }
    }
}
