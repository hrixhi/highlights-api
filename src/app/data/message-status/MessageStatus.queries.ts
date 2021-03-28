import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { MessageStatusModel } from './mongo/message-status.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { CueModel } from '../cue/mongo/Cue.model';

/**
 * Message Status Query Endpoints
 */
@ObjectType()
export class MessageStatusQueryResolver {

    @Field(type => Number, {
        description: "Used to find one user by id."
    })
    public async totalUnreadMessages(
        @Arg("userId", type => String)
        userId: string,
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {
            const statuses: any[] = await MessageStatusModel.find({
                userId,
                channelId
            })
            const groupIds: any[] = []
            if (statuses.length === 0) {
                return 0
            } else {
                statuses.map((s) => {
                    const status = s.toObject()
                    if (!groupIds.find((g) => g === status.groupId)) {
                        groupIds.push(status.groupId)
                    }
                })
            }
            // Takes into account groups
            const allStatuses = await MessageStatusModel.find({
                groupId: { $in: groupIds }, userId
            })
            return allStatuses.length
        } catch (e) {
            console.log(e)
            return 0
        }
    }

}