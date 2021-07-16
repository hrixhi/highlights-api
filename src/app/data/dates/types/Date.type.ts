import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { Ctx, Field, ObjectType } from 'type-graphql';

@ObjectType()
export class EventObject {

  @Field(type => String, { nullable: true }) 
  public async eventId() {
    const localThis: any = this;
    const { _id } = localThis._doc || localThis;
    return _id ? _id : ""
  }

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
  public async createdBy(@Ctx() context: IGraphQLContext) {
    const localThis: any = this;
    const { scheduledMeetingForChannelId } = localThis._doc || localThis;
    if (scheduledMeetingForChannelId) {

      const channel = await ChannelModel.findById(scheduledMeetingForChannelId)

      if (channel && channel.owners && context.user && channel.createdBy !== context.user!._id) {

        const anotherOwner = channel.owners.find((item: any) => {
          return item === context.user!._id
        })
        if (anotherOwner) {
          return anotherOwner
        }
      }

      return channel ? channel.createdBy : ''
    } else {
      return ''
    }
  }

  @Field(type => String, { nullable: true })
  public dateId?: string;

  @Field(type => String, { nullable: true })
  public scheduledMeetingForChannelId?: string;

  @Field(type => String, { nullable: true })
  public description?: string;

  @Field(type => Boolean, { nullable: true })
  public recordMeeting?: boolean;

  @Field(type => String, { nullable: true })
  public recordingLink?: string;

  @Field(type => String, { nullable: true })
  public recurringId?: string;

  @Field(type => Boolean, { nullable: true })
  public meeting?: boolean;
}

@ObjectType()
export class LectureRecording {

  @Field(type => String, { nullable: true })
  public recordID: string;

  @Field(type => String, { nullable: true })
  public url?: string;

  @Field(type => Date, { nullable: true })
  public startTime?: Date;

  @Field(type => Date, { nullable: true })
  public endTime?: Date;

  @Field(type => String, { nullable: true })
  public thumbnail?: string;

}