import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { Ctx, Field, ObjectType } from 'type-graphql';
import { ModificationsModel } from '@app/data/modification/mongo/Modification.model';
import { CueModel } from '@app/data/cue/mongo/Cue.model';

@ObjectType()
export class EventObject {

  @Field(type => String, { nullable: true }) 
  public async eventId() {
    const localThis: any = this;
    console.log("localThis", localThis)
    const { _id, dateId = "" } = localThis._doc || localThis;
    return _id ? _id : dateId
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
  public async channelId() {
    const localThis: any = this;
    const { scheduledMeetingForChannelId } = localThis._doc || localThis;
    if (scheduledMeetingForChannelId) {
      return scheduledMeetingForChannelId ? scheduledMeetingForChannelId : ''
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
          return item === context.user!._id.toString()
        })
        if (anotherOwner) {
          return anotherOwner
        }
      }

      return channel ? channel.createdBy : ''
    } else {
      if (context.user && context.user!._id !== "") {
        return context.user!._id
      }
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

  @Field(type => String, { nullable: true })
  public cueId?: string;

  @Field(type => Boolean, { nullable: true })
  public meeting?: boolean;

  @Field(type => Boolean, { nullable: true })
  public async submitted(@Ctx() context: IGraphQLContext) {
    const localThis: any = this;
    const { cueId } = localThis._doc || localThis;
    if (cueId && cueId !== "" && context.user) {

      const cue = await CueModel.findOne({
        _id: cueId
      })

      if (!cue) return null;

      const mod = await ModificationsModel.findOne({
        cueId,
        userId: context.user!._id
      })

      if (!mod) return null;

      if (cue.submission) {
        return mod.submittedAt ? true : false
      } 
    
    } 
      
    return null

  }
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