import { Field, InputType } from 'type-graphql';

@InputType()
export class UserCreate {
    @Field()
    public email: string;

    @Field()
    public fullName: string;

    @Field()
    public grade: string;

    @Field()
    public section: string;

    @Field()
    public role: string;

    @Field(type => String, { nullable: true })
    public sisId?: string;

    @Field(type => String, { nullable: true })
    public preferredName?: string;

    @Field(type => Number, { nullable: true })
    public gradYear?: number;
}
