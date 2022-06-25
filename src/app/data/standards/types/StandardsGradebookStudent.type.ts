import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';

@ObjectType()
class StandardsEntryStudentObject {
    @Field((type) => String)
    public _id: string;

    @Field((type) => String)
    public title: string;

    @Field((type) => String, { nullable: true })
    public description?: string;

    @Field((type) => String, { nullable: true })
    public category?: string;

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
class StandardsGradebookTotalStudentObject {
    @Field((type) => String)
    public category: string;

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
export class StandardsGradebookStudentObject {
    @Field((type) => [StandardsEntryStudentObject])
    public entries: StandardsEntryStudentObject[];

    @Field((type) => [StandardsGradebookTotalStudentObject])
    public totals: StandardsGradebookTotalStudentObject[];
}
