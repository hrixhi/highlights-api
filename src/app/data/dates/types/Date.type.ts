import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class EventObject {

  @Field()
  public title: string;

  @Field()
  public start: Date;

  @Field()
  public end: Date;

  @Field(type => String, { nullable: true })
  public async channelName() {
    const localThis: any = this;
    const { scheduledMeetingForChannelId, channelName } = localThis._doc || localThis;
    if (channelName && channelName !== '') {
      return channelName
    } else if (scheduledMeetingForChannelId) {
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