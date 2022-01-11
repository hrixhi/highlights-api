import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AddCoursesResponseObject {
    @Field(type => [String])
    public successful: [String];

    @Field(type => [String])
    public failed: [String];

    @Field(type => String)
    public error: String;
}
