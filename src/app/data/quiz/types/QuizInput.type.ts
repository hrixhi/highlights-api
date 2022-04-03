import { Field, InputType } from 'type-graphql';

@InputType()
class AnswerInputObject {

  @Field(type => String)
  public option: string;

  @Field(type => Boolean)
  public isCorrect: boolean;

}

@InputType()
class DragDropInputObject {

  @Field(type => String)
  public id: string;

  @Field(type => String)
  public content: string;

}

@InputType()
class HotSpotInputObject {

  @Field(type => Number)
  public x: number;

  @Field(type => Number)
  public y: number;

}

@InputType()
class HotSpotOptionInputObject {

  @Field(type => String, { nullable: true })
  public option?: string;

  @Field(type => Boolean)
  public isCorrect: boolean;

}

@InputType()
class InlineChoiceOptionInputObject {

  @Field(type => String)
  public option: string;

  @Field(type => Boolean)
  public isCorrect: boolean;

}

@InputType()
class TextEntryOptionInputObject {

  @Field(type => String)
  public option: string;

  @Field(type => String)
  public type: string;

  @Field(type => Number)
  public points: number

}

@InputType()
class ProblemInputObject {

  @Field(type => String)
  public question: string;

  @Field(type => String)
  public points: string;

  @Field(type => String,  { nullable: true })
  public questionType?: string;

  @Field(type => [AnswerInputObject])
  public options: AnswerInputObject[];

  @Field(type => Boolean, { nullable: true })
  public required?: boolean;

  @Field(type => [[DragDropInputObject]], { nullable: true })
  public dragDropData?: DragDropInputObject[][];

  @Field(type => [String], { nullable: true })
  public dragDropHeaders?: string[];

  // hot spot
  @Field(type => String, { nullable: true })
  public imgUrl?: string;

  @Field(type => [HotSpotInputObject], { nullable: true })
  public hotspots?: HotSpotInputObject[];

  @Field(type => [HotSpotOptionInputObject], { nullable: true })
  public hotspotOptions?: HotSpotOptionInputObject[];

  // Highlight Text
  @Field(type => String, { nullable: true })
  public highlightTextHtml?: string;

  @Field(type => [Boolean], { nullable: true })
  public highlightTextChoices?: boolean[];

  @Field(type => String, { nullable: true })
  public inlineChoiceHtml?: string;

  @Field(type => [[InlineChoiceOptionInputObject]], { nullable: true })
  public inlineChoiceOptions?: InlineChoiceOptionInputObject[][];

  @Field(type => String, { nullable: true })
  public textEntryHtml?: string;

  @Field(type => [TextEntryOptionInputObject], { nullable: true })
  public textEntryOptions?: TextEntryOptionInputObject[];

  @Field(type => [String], { nullable: true })
  public multipartQuestions?: string[];
  
  @Field(type => [[InlineChoiceOptionInputObject]], { nullable: true })
  public multipartOptions?: InlineChoiceOptionInputObject[][];

  @Field(type => [String], { nullable: true })
  public correctEquations?: string[]

  @Field(type => Number, { nullable: true })
  public maxCharCount?: number

  @Field(type => [String], { nullable: true })
  public matchTableHeaders?: string[]

  @Field(type => [String], { nullable: true })
  public matchTableOptions?: string[]

  @Field(type => [[Boolean]], { nullable: true })
  public matchTableChoices?: boolean[][];
  
}

@InputType()
export class QuizInputObject {

  @Field(type => [ProblemInputObject])
  public problems: ProblemInputObject[];

  @Field(type => String, { nullable: true })
  public duration?: string;

  @Field(type => Boolean, { nullable: true })
  public shuffleQuiz?: boolean;

  @Field(type => String, { nullable: true })
  public instructions?: string;

  @Field(type => String, { nullable: true })
  public headers?: string;

}
