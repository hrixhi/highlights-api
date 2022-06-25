import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';

@ObjectType()
export class PerformerUserObject {
    @Field((type) => String)
    public userId: string;

    @Field((type) => Number)
    public score: number;

    @Field((type) => Number)
    public pointsScored: number;

    @Field((type) => String)
    public fullName: string;

    @Field((type) => String, { nullable: true })
    public avatar: string;
}

@ObjectType()
export class GradebookAssignmentStatsObject {
    @Field((type) => String)
    public title: string;

    @Field((type) => Number)
    public totalPoints: number;

    @Field((type) => Date)
    public deadline: Date;

    @Field((type) => String, { nullable: true })
    public cueId?: string;

    @Field((type) => String, { nullable: true })
    public gradebookEntryId?: string;

    @Field((type) => Number)
    public gradeWeight: number;

    @Field((type) => Boolean)
    public releaseSubmission: boolean;

    @Field((type) => Number)
    public max: number;

    @Field((type) => Number)
    public min: number;

    @Field((type) => Number)
    public mean: number;

    @Field((type) => Number)
    public median: number;

    @Field((type) => Number)
    public std: number;

    @Field((type) => Number)
    public maxPts: number;

    @Field((type) => Number)
    public minPts: number;

    @Field((type) => Number)
    public meanPts: number;

    @Field((type) => Number)
    public medianPts: number;

    @Field((type) => Number)
    public stdPts: number;

    @Field((type) => Number)
    public sharedWith: number;

    @Field((type) => Number)
    public submitted: number;

    @Field((type) => Number)
    public graded: number;

    @Field((type) => [PerformerUserObject], { nullable: true })
    public topPerformers?: PerformerUserObject[];

    @Field((type) => [PerformerUserObject], { nullable: true })
    public bottomPerformers?: PerformerUserObject[];
}
