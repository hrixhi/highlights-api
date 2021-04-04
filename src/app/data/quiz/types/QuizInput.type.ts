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

    @Field(type => [AnswerInputObject])
    public options: AnswerInputObject[];

}

@InputType()
export class QuizInputObject {

  @Field(type => [ProblemInputObject])
  public problems: ProblemInputObject[];

}
