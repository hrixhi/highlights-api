import { Field, InputType } from 'type-graphql';

@InputType()
export class UserUpdate {

  @Field()
  public _id: string;

  @Field()
  public fullName: string;

  @Field()
  public displayName: string;

  @Field()
  public notificationId: string;

}
