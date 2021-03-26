import { UserModel } from '@app/data/user/mongo/User.model';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class MessageStatusObject {

  @Field()
  public _id: string;

  @Field()
  public userId: string;

  @Field()
  public groupId: string;

  @Field()
  public channelId: string;


}