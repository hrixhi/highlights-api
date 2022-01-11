import { Field, InputType } from 'type-graphql';

@InputType()
export class AddEnrollmentAdmin {
    @Field(type => String, { nullable: true })
    public courseSisId?: string;

    @Field(type => String, { nullable: true })
    public courseAccessCode?: string;

    @Field(type => String, { nullable: true })
    public userSisId?: string;

    @Field(type => String, { nullable: true })
    public userEmail?: string;

    @Field()
    public enrollmentType: string;

    @Field()
    public index: string;
}
