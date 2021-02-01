import { UserModel } from '@app/data/user/mongo/User.model';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class StatusObject {

  @Field()
  public _id: string;

  @Field()
  public userId: string;

  @Field()
  public cueId: string;

  @Field()
  public status: string;

  @Field()
  public channelId: string;

  @Field(type => String)
  public async displayName() {
    const localThis: any = this;
    const { userId } = localThis._doc || localThis;
    const user = await UserModel.findById(userId)
    return user ? user.displayName : ''
  }

}