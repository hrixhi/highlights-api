import { Field, InputType } from 'type-graphql';

@InputType()
export class CourseCreateAdmin {
    @Field()
    public name: string;

    @Field()
    public password: string;

    @Field(type => String, { nullable: true })
    public sisId?: string;

    @Field(type => String, { nullable: true })
    public courseOwnerEmail?: string;

    @Field(type => String, { nullable: true })
    public courseOwnerSisId?: string;
}
