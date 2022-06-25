import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';

@ObjectType()
class GradebookStudentEntryObject {
    @Field((type) => String)
    public title: string;

    @Field((type) => Number)
    public gradeWeight: number;

    @Field((type) => Date)
    public deadline: Date;

    @Field((type) => Date, { nullable: true })
    public availableUntil?: Date;

    @Field((type) => Date, { nullable: true })
    public initiateAt?: Date;

    @Field((type) => Number)
    public totalPoints: number;

    @Field((type) => String, { nullable: true })
    public cueId?: string;

    @Field((type) => String, { nullable: true })
    public gradebookEntryId?: string;

    @Field((type) => Boolean, { nullable: true })
    public releaseSubmission?: boolean;

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
class GradebookStudentTotalObject {
    @Field((type) => Number, { nullable: true })
    public totalPointsPossible?: number;

    @Field((type) => Number, { nullable: true })
    public pointsScored?: number;

    @Field((type) => Number)
    public score: number;

    @Field((type) => String, { nullable: true })
    public gradingScaleOutcome: string;

    @Field((type) => Number)
    public totalAssessments: number;

    @Field((type) => Number)
    public notSubmitted: number;

    @Field((type) => Number)
    public submitted: number;

    @Field((type) => Number)
    public graded: number;

    @Field((type) => Number)
    public lateSubmissions: number;

    @Field((type) => Number)
    public courseProgress: number;

    @Field((type) => Date, { nullable: true })
    public nextAssignmentDue?: Date;
}

@ObjectType()
export class GradebookStudentObject {
    @Field((type) => [GradebookStudentEntryObject])
    public entries: GradebookStudentEntryObject[];

    @Field((type) => GradebookStudentTotalObject)
    public total: GradebookStudentTotalObject;
}
