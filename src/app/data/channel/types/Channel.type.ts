import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ChannelObject {

  @Field()
  public _id: string;

  @Field()
  public name: string;

  @Field({ nullable: true })
  public password: string;

  @Field()
  public createdBy: string;

  @Field(type => Boolean, { nullable: true })
  public meetingOn?: boolean;

  @Field(type => Boolean, { nullable: true })
  public creatorUnsubscribed?: boolean;

}
