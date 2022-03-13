import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AddUsersEmailObject {

    @Field(type => [String])
    public success: string[];

    @Field(type => [String])
    public failed: string[];

    @Field(type => String, { nullable: true })
    public error?: string;

}
