import { Field, InputType } from 'type-graphql';

@InputType()
export class NewCourseAdmin {
    @Field()
    public name: string;

    @Field()
    public createdBy: string;

    @Field()
    public schoolId: string;

    @Field((type) => String, { nullable: true })
    public password: string;

    @Field((type) => String, { nullable: true })
    public sisId?: string;

    @Field((type) => [String], { nullable: true })
    public subscribers?: string[];

    @Field((type) => [String], { nullable: true })
    public moderators?: string[];

    @Field((type) => String, { nullable: true })
    public colorCode?: string;

    @Field((type) => String, { nullable: true })
    public term?: string;

    @Field((type) => Date, { nullable: true })
    public startDate?: Date;

    @Field((type) => Date, { nullable: true })
    public endDate?: Date;

    @Field((type) => Number, { nullable: true })
    public creditHours?: number;

    @Field((type) => String, { nullable: true })
    public gradingScale?: string;

    @Field((type) => String, { nullable: true })
    public standardsBasedGradingScale?: string;
}
