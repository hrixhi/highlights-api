import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { UserModel } from '@app/data/user/mongo/User.model';
import { Field, ObjectType } from 'type-graphql';

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

}