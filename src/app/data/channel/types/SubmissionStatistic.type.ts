import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class SubmissionStatisticObject {

  @Field()
  public cueId: string;

  @Field()
  public max: number;

  @Field()
  public min: number;

  @Field()
  public mean: number;

  @Field()
  public median: number;

  @Field()
  public std: number;

  @Field()
  public submissionCount: number;

}
