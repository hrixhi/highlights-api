import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';

@ObjectType()
export class GradebookUserScoreObject {
    @Field((type) => Number)
    public score: number;

    @Field((type) => Number)
    public pointsScored: number;

    @Field((type) => String, { nullable: true })
    public gradebookEntryId?: string;

    @Field((type) => String, { nullable: true })
    public cueId?: string;
}

@ObjectType()
export class GradebookUserStatsObject {
    @Field((type) => Number)
    public score: number;

    @Field((type) => Number)
    public sharedWith: number;

    @Field((type) => Number)
    public graded: number;

    @Field((type) => Number)
    public submitted: number;

    @Field((type) => Number)
    public progress: number;

    @Field((type) => [GradebookUserScoreObject])
    public scores: GradebookUserScoreObject[];
}
