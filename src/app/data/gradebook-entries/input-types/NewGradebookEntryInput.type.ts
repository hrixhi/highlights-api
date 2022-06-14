import { Field, InputType } from 'type-graphql';

@InputType()
class GradebookEntryScoreInput {
    @Field((type) => String)
    public userId: string;

    @Field((type) => Boolean)
    public submitted: boolean;

    @Field((type) => Number, { nullable: true })
    public points?: number;

    @Field((type) => Boolean, { nullable: true })
    public lateSubmission?: boolean;

    @Field((type) => Date, { nullable: true })
    public submittedAt?: Date;

    @Field((type) => String, { nullable: true })
    public feedback?: string;
}

@InputType()
export class NewGradebookEntryInput {
    @Field((type) => String)
    public title: string;

    @Field((type) => Number)
    public totalPoints: number;

    @Field((type) => Number)
    public gradeWeight: number;

    @Field((type) => Date)
    public deadline: Date;

    @Field((type) => String)
    public channelId: string;

    @Field((type) => [GradebookEntryScoreInput])
    public scores: GradebookEntryScoreInput[];
}
