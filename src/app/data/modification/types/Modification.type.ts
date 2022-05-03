import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';

@ObjectType()
export class ScoreObject {
    @Field()
    public cueId: string;

    @Field({ nullable: true })
    public score: string;

    @Field({ nullable: true })
    public submittedAt: string;

    // @Field({ nullable: true })
    // public gradeWeight: string;

    @Field((type) => String, { nullable: true })
    public async gradeWeight(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { gradeWeight } = localThis._doc || localThis;
        if (gradeWeight) {
            return gradeWeight;
        }

        return '0';
    }

    @Field({ nullable: true })
    public graded: boolean;

    @Field({ nullable: true })
    public releaseSubmission: boolean;
}

@ObjectType()
export class GradeObject {
    @Field()
    public userId: string;

    @Field((type) => String)
    public displayName: string;

    @Field((type) => String)
    public fullName: string;

    @Field((type) => String, { nullable: true })
    public avatar?: string;

    @Field((type) => String, { nullable: true })
    public email: string;

    @Field((type) => [ScoreObject])
    public scores: ScoreObject[];
}
