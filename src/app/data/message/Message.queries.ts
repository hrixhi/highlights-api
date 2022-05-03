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

    @Field(type => String, {
        description: "Used to get group if users exists"
    })
    public async searchMessages(
        @Arg("term", type => String)
        term: string,
        @Arg("userId", type => String)
        userId: string
    ) {
        try {
            const toReturn: any = {
                "messages": []
            };

            // Messages
            const groups = await GroupModel.find({
                users: userId
            });
            const groupIds = groups.map((g: any) => {
                const group = g.toObject();
                return group._id;
            });

            let groupUsersMap: any = {};

            groups.map((g: any) => {
                const group = g.toObject();
                groupUsersMap[group._id.toString()] = group.users;
            });

            const messages = await MessageModel.find({
                message: new RegExp(term, 'i'),
                groupId: { $in: groupIds }
            })
            .populate({
                path: "groupId",
                model: "groups", 
                select: ["name", "users", "image"],
                populate: { 
                    path:  'users', 
                    model: 'users',
                    select: ["_id", "fullName", "avatar",]
                }
              })
              

            console.log('Messages', messages);

            const messagesWithUsers = messages.map((mess: any) => {
                const messObj = mess.toObject();

                const users = groupUsersMap[messObj.groupId.toString()];

                if (users) {
                    return {
                        ...messObj,
                        users
                    };
                }

                return {
                    ...messObj,
                    users: []
                };
            });

            console.log("Message with users", messagesWithUsers)

            toReturn['messages'] = messagesWithUsers;

            return JSON.stringify(toReturn)

        } catch (e) {
           return "ERROR" 
        }
    }

}