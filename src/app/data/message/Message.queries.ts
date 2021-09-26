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
        @Arg("groupId", type => String)
        groupId: string
    ) {
        try {
            const groupDoc = await GroupModel.findOne({
                _id: groupId
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

    @Field(type => String, {
        description: "Used to get group if users exists"
    })
    public async getGroupId(
        @Arg("users", type => [String])
        users: string[]
    ) {
        try {
            const groupDoc = await GroupModel.findOne({
                users: { $all: users, $size: users.length }
            })
            if (groupDoc) {
                return groupDoc._id;
            } 

            return ''
        } catch (e) {
            console.log(e)
            return ''
        }
    }

}