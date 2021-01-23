import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class UserObject {

  @Field()
  public _id: string;

  @Field()
  public fullName: string;

  @Field()
  public displayName: string;

  @Field()
  public notificationId: string;

}