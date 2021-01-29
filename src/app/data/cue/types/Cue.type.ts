import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { StatusModel } from '@app/data/status/mongo/Status.model';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { Ctx, Field, ObjectType } from 'type-graphql';

@ObjectType()
export class CueObject {

  @Field()
  public _id: string;

  @Field()
  public cue: string;

  @Field()
  public frequency: string;

  @Field()
  public date: Date;

  @Field()
  public starred: boolean;

  @Field()
  public shuffle: boolean;

  @Field()
  public color: number;

  @Field()
  public createdBy: string;

  @Field({ nullable: true })
  public channelId: string;

  @Field({ nullable: true })
  public endPlayAt: string;

  @Field(type => String, { nullable: true })
  public async customCategory() {
    const localThis: any = this;
    const { channelId, customCategory } = localThis._doc || localThis;
    if (channelId) {
      const channel = await ChannelModel.findById(channelId)
      return channel ? channel.name : ''
    } else {
      return customCategory
    }
  }

  @Field(type => String, { nullable: true })
  public async status(@Ctx() context: IGraphQLContext) {

    const localThis: any = this;
    const { _id, channelId } = localThis._doc || localThis;

    if (context.user === null) {
      return 'not-delivered'
    }

    const status = await StatusModel.findOne({
      cueId: _id,
      userId: context.user!._id
    })

    if (status) {
      return status.status
    } else {
      await StatusModel.create({
        cueId: _id,
        userId: context.user!._id,
        channelId,
        status: 'not-delivered'
      })
      return 'not-delivered'
    }

  }

  @Field(type => String, { nullable: true })
  public async channelName() {
    const localThis: any = this;
    const { channelId } = localThis._doc || localThis;
    if (!channelId) {
      return ''
    }
    const channel = await ChannelModel.findById(channelId)
    if (channel) {
      return channel.name
    } else {
      return ''
    }
  }

}
