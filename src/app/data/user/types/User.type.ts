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

  @Field({ nullable: true })
  public randomShuffleFrequency?: string;

  @Field({ nullable: true })
  public sleepFrom?: string;

  @Field({ nullable: true })
  public sleepTo?: string;

  @Field({ nullable: true })
  public email?: string;

  // @Field({ nullable: true })
  // public password?: string;

  @Field({ nullable: true })
  public currentDraft?: string;

}