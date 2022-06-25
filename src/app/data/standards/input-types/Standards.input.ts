import { Field, InputType } from 'type-graphql';

@InputType()
export class StandardInput {
    @Field()
    public title: string;

    @Field((type) => String, { nullable: true })
    public description?: string;

    @Field((type) => String, { nullable: true })
    public category?: string;
}

@InputType()
export class StandardScoresInput {
    @Field((type) => String)
    public userId: string;

    @Field((type) => Number)
    public points: number;
}

@InputType()
export class NewStandardsInput {
    @Field((type) => [StandardInput])
    public standards: StandardInput[];

    @Field((type) => [[StandardScoresInput]], { nullable: true })
    public standardsScores?: StandardScoresInput[][];

    @Field()
    public channelId: string;
}
