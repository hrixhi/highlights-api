import { MessageStatusModel } from '@app/data/message-status/mongo/message-status.model';
import { MessageModel } from '@app/data/message/mongo/Message.model';
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

    @Field(type => Boolean, { nullable: true })
    public meetingOn?: boolean;

    // For groups
    @Field(type => String, { nullable: true })
    public name?: string;

    @Field(type => String, { nullable: true })
    public image?: string;

    @Field(type => String, { nullable: true })
    public createdBy?: string;

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
    public async userNames() {
        const localThis: any = this;
        const { users } = localThis._doc || localThis;
        try {
            return await UserModel.find({ _id: { $in: users } })
        } catch (e) {
            return []
        }
    }

    @Field(type => String, { nullable: true })
    public async lastMessage() {
        const localThis: any = this;
        const { _id } = localThis._doc || localThis;
        try {
            const m = await MessageModel.find({
                groupId: _id
            }).sort({ _id: -1 })
            console.log(m)
            if (m && m[0]) {
                const message = m[0].toObject()
                return message.message
            } else {
                return ''
            }
        } catch (e) {
            console.log(e)
            return ''
        }
    }

    @Field(type => Date, { nullable: true })
    public async lastMessageTime() {
        const localThis: any = this;
        const { _id } = localThis._doc || localThis;
        try {
            const m = await MessageModel.find({
                groupId: _id
            }).sort({ _id: -1 }).limit(1)
            if (m && m[0]) {
                const message = m[0].toObject()
                return message.sentAt
            } else {
                return null
            }
        } catch (e) {
            return null
        }
    }

}