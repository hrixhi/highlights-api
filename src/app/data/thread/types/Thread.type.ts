import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { ThreadStatusModel } from '@app/data/thread-status/mongo/thread-status.model';
import { UserModel } from '@app/data/user/mongo/User.model';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { Ctx, Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ThreadObject {

  @Field()
  public _id: string;

  @Field()
  public message: string;

  @Field()
  public userId: string;

  @Field()
  public channelId: string;

  @Field()
  public time: Date;

  @Field()
  public isPrivate: boolean;

  @Field()
  public anonymous: boolean;

  @Field({ nullable: true })
  public cueId?: string;

  @Field({ nullable: true })
  public category?: string;

  @Field({ nullable: true })
  public parentId?: string;

  @Field(type => String, { nullable: true })
  public async displayName() {
    const localThis: any = this;
    const { userId } = localThis._doc || localThis;
    const user = await UserModel.findById(userId)
    if (user) {
      return user.displayName
    } else {
      return ''
    }
  }

  @Field(type => String, { nullable: true })
  public async fullName() {
    const localThis: any = this;
    const { userId } = localThis._doc || localThis;
    const user = await UserModel.findById(userId)
    if (user) {
      return user.fullName
    } else {
      return ''
    }
  }

  @Field(type => String, { nullable: true })
  public async avatar() {
    const localThis: any = this;
    const { userId } = localThis._doc || localThis;
    const user = await UserModel.findById(userId)
    if (user) {
      return user.avatar
    } else {
      return ''
    }
  }

  @Field(type => Number, { nullable: true })
  public async unreadThreads(@Ctx() context: IGraphQLContext) {
    const localThis: any = this;
    const { _id } = localThis._doc || localThis;
    try {
      const threads = await ThreadStatusModel.find({
        userId: context?.user?._id, threadId: _id
      })
      return threads.length
    } catch (e) {
      return 0
    }
  }


}