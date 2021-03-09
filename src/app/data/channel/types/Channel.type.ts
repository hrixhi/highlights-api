import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class EventObject {

  @Field()
  public title: string;

  @Field()
  public start: Date;

  @Field()
  public end: Date;

}

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

}
