import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class EventObject {

  @Field()
  public title: string;

  @Field()
  public start: Date;

  @Field()
  public end: Date;

  @Field(type => String, { nullable: true })
  public channelName?: string;

}