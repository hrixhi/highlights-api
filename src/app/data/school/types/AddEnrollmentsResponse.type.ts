import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class Failed {
    @Field(type => String)
    public index: String;

    @Field(type => String)
    public errorType: String;
}

@ObjectType()
export class AddEnrollmentsResponseObject {
    @Field(type => [String])
    public successful: [String];

    @Field(type => [Failed])
    public failed: [Failed];

    @Field(type => [String])
    public alreadyExist: [String]

    @Field(type => String)
    public error: String;
}
