import { Field, InputType } from 'type-graphql';

@InputType()
export class NewAdminInputObject {
    @Field()
    public email: string;

    @Field()
    public fullName: string;

    @Field((type) => String, { nullable: true })
    public avatar?: string;

    @Field((type) => String)
    public schoolId: string;

    @Field((type) => String)
    public role: string;

    @Field((type) => [String])
    public permissions: string[];

    @Field((type) => String)
    public phoneNumber: string;

    @Field((type) => String)
    public jobTitle: string;
}
