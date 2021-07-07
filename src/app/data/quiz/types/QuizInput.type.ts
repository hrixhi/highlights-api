import { Field, InputType } from 'type-graphql';

@InputType()
class AnswerInputObject {

  @Field(type => String)
  public option: string;

  @Field(type => Boolean)
  public isCorrect: boolean;

}

@InputType()
class ProblemInputObject {

  @Field(type => String)
  public question: string;

  @Field(type => String)
  public points: string;

  @Field(type => String,  { nullable: true })
  public questionType: string;

  @Field(type => [AnswerInputObject])
  public options: AnswerInputObject[];

}

@InputType()
export class QuizInputObject {

  @Field(type => [ProblemInputObject])
  public problems: ProblemInputObject[];

  @Field(type => String, { nullable: true })
  public duration?: string;

  @Field(type => Boolean, { nullable: true })
  public shuffleQuiz?: boolean;

}
