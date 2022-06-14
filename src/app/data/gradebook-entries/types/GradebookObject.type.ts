import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';

@ObjectType()
export class GradebookScoreObject {
    @Field((type) => String)
    public userId: string;

    @Field((type) => Boolean)
    public submitted: boolean;

    @Field((type) => Number, { nullable: true })
    public pointsScored?: number;

    @Field((type) => Number, { nullable: true })
    public score?: number;

    @Field((type) => Boolean, { nullable: true })
    public lateSubmission?: boolean;

    @Field((type) => Date, { nullable: true })
    public submittedAt?: Date;
}

@ObjectType()
export class GradebookEntryObject {
    @Field((type) => String)
    public title: string;

    @Field((type) => Number)
    public gradeWeight: number;

    @Field((type) => Date)
    public deadline: Date;

    @Field((type) => Number)
    public totalPoints: number;

    @Field((type) => String, { nullable: true })
    public cueId?: string;

    @Field((type) => String, { nullable: true })
    public gradebookEntryId?: string;

    @Field((type) => Boolean, { nullable: true })
    public releaseSubmission?: boolean;

    @Field((type) => [GradebookScoreObject])
    public scores: GradebookScoreObject[];
}

@ObjectType()
export class GradebookTotalObject {
    @Field((type) => String)
    public userId: string;

    @Field((type) => Number, { nullable: true })
    public totalPointsPossible?: number;

    @Field((type) => Number, { nullable: true })
    public pointsScored?: number;

    @Field((type) => Number)
    public score: number;

    @Field((type) => String, { nullable: true })
    public gradingScaleOutcome: string;
}

@ObjectType()
export class GradebookUserObject {
    @Field((type) => String)
    public userId: string;

    @Field((type) => String)
    public fullName: string;

    @Field((type) => String, { nullable: true })
    public avatar?: string;
}

@ObjectType()
export class GradebookObject {
    @Field((type) => [GradebookEntryObject])
    public entries: GradebookEntryObject[];

    @Field((type) => [GradebookTotalObject])
    public totals: GradebookTotalObject[];

    @Field((type) => [GradebookUserObject])
    public users: GradebookUserObject[];
}
