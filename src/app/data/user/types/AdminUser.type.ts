import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class AdminUserObject {
    @Field((type) => String)
    public _id: String;

    @Field((type) => String)
    public fullName: String;

    @Field((type) => String)
    public email: String;

    @Field((type) => String)
    public role: String;

    @Field((type) => String)
    public grade: String;

    @Field((type) => String)
    public section: String;
}

@ObjectType()
export class AdminUsersResponsObject {
    @Field((type) => [AdminUserObject])
    public users: AdminUserObject[];

    @Field((type) => [String])
    public gradesAndSections: String;

    @Field((type) => String, { nullable: true })
    public error?: string;
}
