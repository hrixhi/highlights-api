import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import {ThreadStatusModel } from './mongo/thread-status.model';

/**
 * Message Status Query Endpoints
 */
@ObjectType()
export class ThreadStatusQueryResolver {

    @Field(type => Number, {
        description: "Used to find one user by id."
    })
    public async totalUnreadDiscussionThreads(
        @Arg("userId", type => String)
        userId: string,
        @Arg("channelId", type => String)
        channelId: string,
    ) {
        try {
            const statuses: any[] = await ThreadStatusModel.find({
                userId,
                channelId,
                cueId: undefined
            })
            return statuses.length
        } catch (e) {
            console.log(e)
            return 0
        }
    }

    @Field(type => Number, {
        description: "Used to find one user by id."
    })
    public async getUnreadQACount(
        @Arg("userId", type => String)
        userId: string,
        @Arg("cueId", type => String)
        cueId: string,
    ) {
        try {
            const statuses: any[] = await ThreadStatusModel.find({
                userId,
                cueId
            })
            return statuses.length
        } catch (e) {
            console.log(e)
            return 0
        }
    }

}

