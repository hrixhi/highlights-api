import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ActivityObject {

  @Field()
  public _id: string;

  @Field()
  public userId: string;

  @Field()
  public title: string;

  @Field()
  public subtitle: string;

  @Field({ nullable: true })
  public body?: string;

  @Field()
  public status: string;

  @Field()
  public channelId: string;

  @Field(type => Date)
  public date: Date;

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

  @Field(type => String, { nullable: true })
  public async colorCode() {
    const localThis: any = this;
    const { channelId } = localThis._doc || localThis;
    if (channelId) {
      const channel = await ChannelModel.findById(channelId)
      return channel ? channel.colorCode : ''
    } else {
      return ''
    }
  }


}