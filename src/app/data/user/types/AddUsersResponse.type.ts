import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AddUsersResponseObject {
    @Field(type => [String])
    public successful: [String];

    @Field(type => [String])
    public schoolIdExist: [String];

    @Field(type => [String])
    public sisIdExist: [String];

    @Field(type => [String])
    public failedToAdd: [String];

    @Field(type => String)
    public error: String;
}
