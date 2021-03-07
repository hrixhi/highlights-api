import { Arg, Field, ObjectType } from 'type-graphql';
import { GroupModel } from '../group/mongo/Group.model';
import { MessageModel } from './mongo/Message.model';

/**
 * Message Mutation Endpoints
 */
@ObjectType()
export class MessageMutationResolver {

    @Field(type => Boolean, {
        description: 'Used to create a message.'
    })
    public async create(
        @Arg("users", type => [String])
        users: string[],
        @Arg("message", type => String)
        message: string,
    ) {
        try {
            if (users.length === 0) {
                return false
            }
            const groupDoc = await GroupModel.findOne({ users })
            let groupId = ''
            if (groupDoc) {
                groupId = groupDoc._id
            } else {
                const newGroup = await GroupModel.create({
                    users
                })
                groupId = newGroup._id
            }
            await MessageModel.create({
                groupId,
                message,
                sentBy: users[0],
                sentAt: new Date()
            })
            return true;
        } catch (e) {
            return false
        }
    }

}
