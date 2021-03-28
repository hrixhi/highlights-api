import { MessageStatusModel } from '@app/data/message-status/mongo/message-status.model';
import { UserModel } from '@app/data/user/mongo/User.model';
import { UserObject } from '@app/data/user/types/User.type';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { Ctx, Field, ObjectType } from 'type-graphql';

@ObjectType()
export class GroupObject {

    @Field()
    public _id: string;

    @Field(type => [String])
    public users: string[];

    @Field(type => String, { nullable: true })
    public channelId?: string;

    @Field(type => Number)
    public async unreadMessages(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { _id, channelId } = localThis._doc || localThis;
        try {
            const statuses = await MessageStatusModel.find({
                userId: context.user?._id,
                channelId,
                groupId: _id
            })
            return statuses.length
        } catch (e) {
            return 0
        }
    }

    @Field(type => [UserObject])
    public async userNames(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { users } = localThis._doc || localThis;
        try {
            return await UserModel.find({ _id: { $in: users } })
        } catch (e) {
            return []
        }
    }

}