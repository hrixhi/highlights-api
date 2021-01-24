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

}