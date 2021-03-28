import { Arg, Field, ObjectType } from 'type-graphql';
import { GroupObject } from './types/Group.type';
import { GroupModel } from './mongo/Group.model';

/**
 * Group Query Endpoints
 */
@ObjectType()
export class GroupQueryResolver {

    @Field(type => [GroupObject], {
        description: "Used to find one user by id."
    })
    public async getGroups(
        @Arg("userId", type => String)
        userId: string,
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {
            const allGroups: any[] = await GroupModel.find({
                channelId,
                users: { $all: [userId] }
            })
            const groups = allGroups.filter((group) => {
                return group.users.length > 2
            })
            return groups;
        } catch (e) {
            console.log(e)
            return []
        }
    }

}