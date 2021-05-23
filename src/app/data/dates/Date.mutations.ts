import { Arg, Field, ObjectType } from 'type-graphql';
import { DateModel } from './mongo/dates.model';

/**
 * Date Mutation Endpoints
 */
@ObjectType()
export class DateMutationResolver {

    @Field(type => Boolean, {
        description: 'Used when you want to update unread messages count.'
    })
    public async create(
        @Arg('userId', type => String) userId: string,
        @Arg('title', type => String) title: string,
        @Arg('start', type => String) start: string,
        @Arg('end', type => String) end: string,
        @Arg('channelId', type => String, { nullable: true }) channelId?: string
    ) {
        try {
            await DateModel.create({
                userId: channelId && channelId !== '' ? undefined : userId,
                title,
                start: new Date(start),
                end: new Date(end),
                isNonMeetingChannelEvent: channelId && channelId !== '' ? true : false,
                scheduledMeetingForChannelId: channelId && channelId !== '' ? channelId : undefined
            })
            return true;
        } catch (e) {
            return false
        }
    }

    @Field(type => Boolean, {
        description: 'Used when you want to delete a date.'
    })
    public async delete(
        @Arg('dateId', type => String) dateId: string,
    ) {
        try {
            await DateModel.deleteOne({ _id: dateId })
            return true;
        } catch (e) {
            return false
        }
    }

}
