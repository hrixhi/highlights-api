import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { MessageStatusModel } from '@app/data/message-status/mongo/message-status.model';
import { GroupModel } from '@app/data/group/mongo/Group.model';
import { ChannelModel } from '@app/data/channel/mongo/Channel.model';

@ObjectType()
export class ZoomObject {
    @Field()
    public email: string;

    @Field()
    public accountId: string;

}

@ObjectType()
export class UserObject {
    @Field()
    public _id: string;

    @Field()
    public fullName: string;

    @Field()
    public displayName: string;

    @Field()
    public notificationId: string;

    @Field({ nullable: true })
    public randomShuffleFrequency?: string;

    @Field({ nullable: true })
    public sisId?: string;

    @Field({ nullable: true })
    public preferredName?: string;

    @Field({ nullable: true })
    public gradYear?: number;

    @Field({ nullable: true })
    public sleepFrom?: string;

    @Field({ nullable: true })
    public sleepTo?: string;

    @Field({ nullable: true })
    public email?: string;

    // @Field({ nullable: true })
    // public password?: string;

    @Field({ nullable: true })
    public currentDraft?: string;

    @Field(type => Number)
    public async unreadMessages(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { _id } = localThis._doc || localThis;
        const group: any = await GroupModel.findOne({
            $or: [{ users: [context.user?._id, _id] }, { users: [_id, context.user?._id] }]
        });
        if (!group) {
            return 0;
        }
        const statuses: any[] = await MessageStatusModel.find({
            groupId: group._id,
            userId: context.user?._id
        });
        return statuses.length;
    }

    @Field(type => String, { nullable: true })
    public async groupId(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { _id } = localThis._doc || localThis;
        const group: any = await GroupModel.findOne({
            users: {
                $all: [context.user?._id, _id]
            }
        });
        if (!group) {
            return '';
        }
        return group._id;
    }

    @Field({ nullable: true })
    public grade?: string;

    @Field({ nullable: true })
    public section?: string;

    @Field({ nullable: true })
    public role?: string;

    @Field(type => Boolean, { nullable: true })
    public async allowQuizCreation(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { _id, role } = localThis._doc || localThis;

        const isOwner = await ChannelModel.findOne({
            owners: { $all: [_id] }
        })

        if ((isOwner && isOwner?._id) || role === 'instructor') {
            return true
        }

        return false
        
    }

    @Field({ nullable: true })
    public avatar?: string;

    @Field(type => Date, { nullable: true })
    public lastLoginAt?: Date;

    @Field(type => ZoomObject, { nullable: true })
    public zoomInfo?: ZoomObject;

    @Field({ nullable: true })
    public inactive?: boolean;

    @Field(type => [String], { nullable: true })
    public channelIds?: string[];
}
