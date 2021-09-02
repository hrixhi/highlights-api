import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class SchoolObject {

    @Field()
    public _id: string;

    @Field()
    public name: string;

    @Field(type => String, { nullable: true })
    public logo?: string;

    @Field(type => String, { nullable: true })
    public streamId?: string;

    @Field(type => Boolean, { nullable: true })
    public allowStudentChannelCreation?: boolean;

    @Field(type => String, { nullable: true })
    public recoveryEmail?: string;

}