import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { StatusModel } from '@app/data/status/mongo/Status.model';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { Ctx, Field, ObjectType } from 'type-graphql';
import { CueModel } from '../mongo/Cue.model';

@ObjectType()
export class CueObject {

  @Field(type => String)
  public async _id() {
    const localThis: any = this;
    const { cueId, _id } = localThis._doc || localThis;
    if (cueId) {
      return cueId
    } else {
      return _id
    }
  }

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
  public endPlayAt: Date;

  @Field({ nullable: true })
  public customCategory: string;

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
  public async status(@Ctx() context: IGraphQLContext) {

    const localThis: any = this;
    const { channelId, cueId } = localThis._doc || localThis;

    if (!channelId) {
      // local cue
      return 'read'
    }

    if (!context.user!._id) {
      return 'not-delivered'
    }

    const status = await StatusModel.findOne({
      cueId: cueId, // because we are loading channel cues from the modifications collection
      userId: context.user!._id
    })

    if (status) {
      return status.status
    } else {
      await StatusModel.create({
        cueId: cueId,
        userId: context.user!._id,
        channelId,
        status: 'not-delivered'
      })
      return 'not-delivered'
    }

  }

  @Field(type => String, { nullable: true })
  // returns null for personal notes but original cue
  public async original() {
    const localThis: any = this;
    const { cueId } = localThis._doc || localThis;
    if (cueId) {
      const cue = await CueModel.findById(cueId)
      return cue ? cue.cue : null
    } else {
      return null
    }
  }

  // New - for submission and grades
  @Field({ nullable: true })
  public submission: boolean

  @Field({ nullable: true })
  public deadline: Date;

  @Field({ nullable: true })
  public gradeWeight: number;

  @Field({ nullable: true })
  public score: number;

  @Field({ nullable: true })
  public graded: boolean;

  @Field({ nullable: true })
  public submittedAt: Date;

}
