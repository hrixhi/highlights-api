import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AddCoursesResponseObject {
    @Field(type => [String])
    public successful: [String];

    @Field(type => [String])
    public noOwnerFound: [String];

    @Field(type => [String])
    public courseIdFound: [String];

    @Field(type => [String])
    public studentOwner: [String];

    @Field(type => [String])
    public failedToAdd: [String];

    @Field(type => String)
    public error: String;
}
