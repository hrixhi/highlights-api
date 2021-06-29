import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class EventObject {

  @Field(type => String, { nullable: true })
  public async title() {
    const localThis: any = this;
    const { title } = localThis._doc || localThis;
    return title ? title : ''
  }

  @Field()
  public start: Date;

  @Field()
  public end: Date;

  @Field(type => String, { nullable: true })
  public async channelName() {
    const localThis: any = this;
    const { scheduledMeetingForChannelId } = localThis._doc || localThis;
    if (scheduledMeetingForChannelId) {
      const channel = await ChannelModel.findById(scheduledMeetingForChannelId)
      return channel ? channel.name : ''
    } else {
      return ''
    }
  }

  @Field(type => String, { nullable: true })
  public dateId?: string;

  @Field(type => String, { nullable: true })
  public scheduledMeetingForChannelId?: string;

}