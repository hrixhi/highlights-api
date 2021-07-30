import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ScoreObject {

    @Field()
    public cueId: string;

    @Field({ nullable: true })
    public score: string;

    @Field({ nullable: true })
    public submittedAt: string;

    @Field()
    public gradeWeight: string;

    @Field({ nullable: true })
    public graded: boolean;

}

@ObjectType()
export class GradeObject {

    @Field()
    public userId: string;

    @Field(type => String)
    public displayName: string;

    @Field(type => String)
    public fullName: string

    @Field(type => String, { nullable: true })
    public email: string

    @Field(type => [ScoreObject])
    public scores: ScoreObject[];

}