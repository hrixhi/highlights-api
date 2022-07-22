import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class GoogleAuthResponseObject {
    @Field((type) => String, { nullable: true })
    public access_token?: String;

    @Field((type) => String, { nullable: true })
    public error?: String;

    @Field((type) => String, { nullable: true })
    public authorizeUrl?: string;
}
