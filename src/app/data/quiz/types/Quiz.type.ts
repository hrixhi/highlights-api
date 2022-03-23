import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class AnswerObject {

  @Field(type => String)
  public option: string;

  @Field(type => Boolean)
  public isCorrect: boolean;

  @Field(type => Boolean, { nullable: true })
  public previouslyCorrect?: boolean;

}

@ObjectType()
class HotSpotObject {

  @Field(type => Number)
  public x: number;

  @Field(type => Number)
  public y: number;

}

@ObjectType()
class ProblemObject {

  @Field(type => String)
  public question: string;

  @Field(type => String, { nullable: true })
  public questionType?: string;

  @Field(type => [AnswerObject])
  public options: AnswerObject[];

  @Field(type => Number)
  public points: Number;

  @Field(type => Boolean, { nullable: true })
  public required?: boolean;

  @Field({ nullable: true })
  public updatedAt?: Date;

  @Field(type => String, { nullable: true })
  public regradeChoice?: string;

  // Added for drag and drop
  @Field(type => [[String]], { nullable: true })
  public data?: string[][];

  @Field(type => [String], { nullable: true })
  public headers?: string[];

  // hot spot
  @Field(type => String, { nullable: true })
  public imgUrl?: string;

  @Field(type => [HotSpotObject], { nullable: true })
  public hotspots?: HotSpotObject[];

}

@ObjectType()
export class QuizObject {

  @Field(type => [ProblemObject])
  public problems: ProblemObject[];

  @Field(type => Number, { nullable: true })
  public duration?: Number;

  @Field(type => Boolean, { nullable: true })
  public shuffleQuiz?: boolean;

  @Field(type => String, { nullable: true })
  public instructions?: string;

  @Field(type => String, { nullable: true })
  public headers?: string;

}
