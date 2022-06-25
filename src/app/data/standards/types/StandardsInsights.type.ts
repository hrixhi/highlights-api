import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';

@ObjectType()
export class StandardsInsightsScoresObject {
    @Field((type) => String)
    public _id: string;

    @Field((type) => Number)
    public points: number;

    @Field((type) => String)
    public createdAt: string;

    @Field((type) => Boolean)
    public overridden: boolean;
}

@ObjectType()
export class StandardsInsightsObject {
    @Field((type) => [StandardsInsightsScoresObject], { nullable: true })
    public scores?: StandardsInsightsScoresObject[];

    @Field((type) => Number)
    public total?: number;

    @Field((type) => String, { nullable: true })
    public mastery?: string;

    @Field((type) => Number, { nullable: true })
    public masteryPoints?: number;

    @Field((type) => Boolean)
    public overridden: boolean;
}
