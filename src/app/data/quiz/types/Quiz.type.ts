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
class DragDropObject {

  @Field(type => String)
  public id: string;

  @Field(type => String)
  public content: string;

}

@ObjectType()
class HotSpotOptionObject {

  @Field(type => String, { nullable: true })
  public option?: string;

  @Field(type => Boolean)
  public isCorrect: boolean;

}


@ObjectType()
class InlineChoiceOptionObject {

  @Field(type => String)
  public option: string;

  @Field(type => Boolean)
  public isCorrect: boolean;

}

@ObjectType()
class TextEntryOptionObject {

  @Field(type => String)
  public option: string;

  @Field(type => String)
  public type: string;

  @Field(type => Number)
  public points: number

}

@ObjectType()
class ProblemObject {

  @Field(type => String)
  public question: string;

  @Field(type => String, { nullable: true})
  public questionType?: string;

  @Field(type => [AnswerObject])
  public options: AnswerObject[];

  @Field(type => Number)
  public points: Number;

  @Field(type => Boolean, { nullable: true })
  public required?: boolean;

  @Field({ nullable: true })
  public updatedAt?: Date;

  @Field(type => String,  { nullable: true })
  public regradeChoice?: string;

  // hot spot
  @Field(type => String, { nullable: true })
  public imgUrl?: string;

  @Field(type => [HotSpotObject], { nullable: true })
  public hotspots?: HotSpotObject[];

  @Field(type => [HotSpotOptionObject], { nullable: true })
  public hotspotOptions?: HotSpotOptionObject[];

  @Field(type => [[DragDropObject]], { nullable: true })
  public dragDropData?: DragDropObject[][];

  @Field(type => [String], { nullable: true })
  public dragDropHeaders?: string[];

  @Field(type => String, { nullable: true })
  public highlightTextHtml?: string;

  @Field(type => [Boolean], { nullable: true })
  public highlightTextChoices?: boolean[];

  @Field(type => String, { nullable: true })
  public inlineChoiceHtml?: string;

  @Field(type => [[InlineChoiceOptionObject]], { nullable: true })
  public inlineChoiceOptions?: InlineChoiceOptionObject[][];

  @Field(type => String, { nullable: true })
  public textEntryHtml?: string;

  @Field(type => [TextEntryOptionObject], { nullable: true })
  public textEntryOptions?: TextEntryOptionObject[];

  @Field(type => [String], { nullable: true })
  public multipartQuestions?: string[];
  
  @Field(type => [[InlineChoiceOptionObject]], { nullable: true })
  public multipartOptions?: InlineChoiceOptionObject[][];

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
