import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class CueObject {

  @Field()
  public _id: string;

  @Field()
  public cue: string;

  @Field()
  public frequency: string;

  @Field()
  public date: Date;

  @Field()
  public starred: boolean;

  @Field()
  public shuffle: boolean;

  @Field()
  public color: number;

  @Field()
  public customCategory: string;

  @Field()
  public createdBy: string;

  @Field({ nullable: true })
  public channelId: string;

  @Field({ nullable: true })
  public endPlayAt: string;


}


