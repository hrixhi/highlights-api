import { Field, InputType } from 'type-graphql';

@InputType()
export class ImportedCourseAdmin {
    @Field()
    public name: string;

    @Field()
    public sisId: string;

    @Field()
    public password: string;

    @Field()
    public courseOwnerEmail: string;

    @Field()
    public courseOwnerSisId: string;

    @Field()
    public academicTerm: string;
}
