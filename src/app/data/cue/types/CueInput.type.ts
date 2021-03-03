import { Field, InputType, ObjectType } from 'type-graphql';
@InputType()
export class CueInputObject {

  @Field()
  public _id: string;

  @Field({ nullable: true })
  public cue?: string;

  @Field({ nullable: true })
  public frequency?: string;

  @Field({ nullable: true })
  public date?: string;

  @Field({ nullable: true })
  public starred?: boolean;

  @Field({ nullable: true })
  public shuffle?: boolean;

  @Field({ nullable: true })
  public color?: string;

  @Field({ nullable: true })
  public createdBy?: string;

  @Field({ nullable: true })
  public channelId?: string;

  @Field({ nullable: true })
  public endPlayAt?: string;

  @Field({ nullable: true })
  public customCategory?: string;

  @Field({ nullable: true })
  public submission: boolean

  @Field({ nullable: true })
  public deadline: Date;

  @Field({ nullable: true })
  public gradeWeight: number;

  @Field({ nullable: true })
  public score: number;

  @Field({ nullable: true })
  public graded: boolean;

  @Field({ nullable: true })
  public submittedAt: Date;

}
