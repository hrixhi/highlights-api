import { UserModel } from '@app/data/user/mongo/User.model';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class MessageObject {

  @Field()
  public _id: string;

  @Field()
  public sentBy: string;

  @Field({ nullable: true })
  public groupId: string;

  @Field()
  public message: string;

  @Field(type => Date)
  public sentAt: Date;

  @Field(type => String)
  public async displayName() {
    const localThis: any = this;
    const { sentBy } = localThis._doc || localThis;
    const user = await UserModel.findById(sentBy)
    return user ? user.fullName : ''
  }

  @Field(type => String)
  public async fullName() {
    const localThis: any = this;
    const { sentBy } = localThis._doc || localThis;
    const user = await UserModel.findById(sentBy)
    return user ? user.fullName : ''
  }

}