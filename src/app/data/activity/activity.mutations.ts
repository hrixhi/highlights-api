import { Arg, Field, ObjectType } from 'type-graphql';
// import { MessageStatusModel } from './mongo/activity.model';
import { ActivityModel } from './mongo/activity.model';


// /**
//  * Message Status Mutation Endpoints
//  */
@ObjectType()
export class ActivityMutationResolver {

    @Field(type => Boolean, {
        description: 'Used when you want to update unread messages count.'
    })
    public async markActivityAsRead(
        @Arg('activityId', type => String, { nullable: true }) activityId: string,
        @Arg('userId', type => String) userId: string,
        @Arg('markAllRead', type => Boolean) markAllRead: boolean,
    ) {
        try {

            if (markAllRead) {
                const updateAll = await ActivityModel.updateMany({
                    userId
                }, {
                    status: "read"
                })

                return true;
            } else {
                if (!activityId) return false;

                await ActivityModel.updateOne({ _id: activityId, userId }, {
                    status: "read"
                });
            }
            
            return true;
        } catch (e) {
            return false
        }
    }

}
