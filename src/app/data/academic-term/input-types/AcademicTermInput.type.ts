import { Field, InputType } from 'type-graphql';

@InputType()
export class AcademicTermInput {
    @Field((type) => String)
    public name: string;

    @Field((type) => String)
    public startDate: string;

    @Field((type) => String)
    public endDate: string;

    @Field((type) => Boolean)
    public default: boolean;

    @Field((type) => String)
    public schoolId: string;
}
