import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { Field, ObjectType } from 'type-graphql';

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
    // Returns custom category if not channel cue
    // but if channel cue, it returns channel name because that is the category displayed
    const localThis: any = this;
    const { channelId, customCategory } = localThis._doc || localThis;
    if (channelId) {
      const channel = await ChannelModel.findById(channelId)
      return channel ? channel.name : ''
    } else {
      return customCategory
    }
  }

}
