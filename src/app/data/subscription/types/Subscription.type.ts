import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class SubscriptionObject {

  @Field()
  public _id: string;

  @Field()
  public userId: string;

  @Field()
  public channelId: string;

  @Field(type => String)
  public async channelName() {
    const localThis: any = this;
    const { channelId } = localThis._doc || localThis;
    const channel = await ChannelModel.findById(channelId)
    return channel ? channel.name : ''
  }

}