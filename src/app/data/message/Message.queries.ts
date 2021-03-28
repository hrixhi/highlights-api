import { Arg, Field, ObjectType } from 'type-graphql';
import { GroupModel } from '../group/mongo/Group.model';
import { MessageModel } from './mongo/Message.model';
import { MessageObject } from './types/Message.type';

/**
 * Message Query Endpoints
 */
@ObjectType()
export class MessageQueryResolver {

    @Field(type => [MessageObject], {
        description: "Used to get list of messages."
    })
    public async getMessagesThread(
        @Arg("users", type => [String])
        users: string[]
    ) {
        try {
            const groupDoc = await GroupModel.findOne({
                users: { $all: users }
            })
            if (groupDoc) {
                const groupId = groupDoc._id
                return await MessageModel.find({ groupId })
            } else {
                return []
            }
        } catch (e) {
            console.log(e)
            return []
        }
    }

}