import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { UserModel } from '@app/data/user/mongo/User.model';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AttendanceObject {

  @Field(type => Date, { nullable: true })
  public joinedAt: Date;

  @Field(type => String)
  public async displayName() {
    const localThis: any = this;
    const { userId } = localThis._doc || localThis;
    const user = await UserModel.findById(userId)
    return user ? user.displayName : ''
  }

}