import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class SubscriptionObject {

  @Field()
  public _id: string;

  @Field()
  public userId: string;

  @Field()
  public channelId: string;

}