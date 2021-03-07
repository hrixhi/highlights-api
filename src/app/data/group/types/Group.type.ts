import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class GroupObject {

    @Field()
    public _id: string;

    @Field(type => [String])
    public users: string[];

}