import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';


@ObjectType()
export class PerformanceObject {

    @Field()
    public channelId: string;

    @Field()
    public score: string;

    @Field()
    public total: string;

    @Field()
    public submittedAssessments: string;

    @Field()
    public lateAssessments: string;

    @Field()
    public gradedAssessments: string;

    @Field()
    public totalAssessments: string;

    @Field(type => String, { nullable: true })
    public async channelName() {
        const localThis: any = this;
        const { channelId } = localThis._doc || localThis;
        if (channelId) {
            const channel = await ChannelModel.findById(channelId)
            return channel ? channel.name : ''
        } else {
            return ''
        }
    }

    @Field(type => String)
    public async channelCreatedBy(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { channelId } = localThis._doc || localThis;
        const c = await ChannelModel.findById(channelId)
        if (c) {
            const channel = c.toObject()
            if (channel.owners) {
                const anotherOwner = channel.owners.find((item: any) => {
                    return item.toString().trim() === context.user!._id.toString().trim()
                })
                if (anotherOwner) {
                    return anotherOwner
                }
            }
            return channel.createdBy
        }
        return ''
    }

}