import { Arg, Field, ObjectType } from 'type-graphql';
import { ThreadStatusModel } from './mongo/thread-status.model';

/**
 * Thread Status Mutation Endpoints
 */
@ObjectType()
export class ThreadStatusMutationResolver {

    @Field(type => Boolean, {
        description: 'Used when you want to update thread statuses.'
    })
    public async markThreadsAsRead(
        @Arg('threadId', type => String) threadId: string,
        @Arg('userId', type => String) userId: string
    ) {
        try {
            await ThreadStatusModel.updateMany({ threadId, userId }, {
                read: true
            })
            return true;
        } catch (e) {
            return false
        }
    }

}
