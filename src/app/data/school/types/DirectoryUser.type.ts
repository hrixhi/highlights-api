import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class DirectoryUserObject {
    @Field((type) => String)
    public _id: String;

    @Field((type) => String)
    public fullName: String;

    @Field((type) => String, { nullable: true })
    public avatar: String;

    @Field((type) => String)
    public role: String;

    @Field((type) => String, { nullable: true })
    public grade: String;

    @Field((type) => String, { nullable: true })
    public section: String;

    @Field((type) => String)
    public roleDescription: String;

    @Field((type) => [String], { nullable: true })
    public courses?: [String];
}
