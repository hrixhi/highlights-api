import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';

@ObjectType()
class StandardsEntryScoreObject {
    @Field((type) => String)
    public userId: string;

    @Field((type) => Number, { nullable: true })
    public points?: number;

    @Field((type) => String, { nullable: true })
    public mastery?: string;

    @Field((type) => Number, { nullable: true })
    public masteryPoints?: number;

    @Field((type) => Boolean, { nullable: true })
    public overridden?: boolean;
}

@ObjectType()
class StandardsEntryObject {
    @Field((type) => String)
    public _id: string;

    @Field((type) => String)
    public title: string;

    @Field((type) => String, { nullable: true })
    public description?: string;

    @Field((type) => String, { nullable: true })
    public category?: string;

    @Field((type) => [StandardsEntryScoreObject])
    public scores: StandardsEntryScoreObject[];
}

@ObjectType()
class StandardsGradebookTotalObject {
    @Field((type) => String)
    public category: string;

    @Field((type) => [StandardsEntryScoreObject])
    public scores: StandardsEntryScoreObject[];
}

@ObjectType()
class StandardsGradebookUserObject {
    @Field((type) => String)
    public userId: string;

    @Field((type) => String)
    public fullName: string;

    @Field((type) => String, { nullable: true })
    public avatar?: string;
}

@ObjectType()
export class StandardsGradebookObject {
    @Field((type) => [StandardsEntryObject])
    public entries: StandardsEntryObject[];

    @Field((type) => [StandardsGradebookTotalObject])
    public totals: StandardsGradebookTotalObject[];

    @Field((type) => [StandardsGradebookUserObject])
    public users: StandardsGradebookUserObject[];
}
