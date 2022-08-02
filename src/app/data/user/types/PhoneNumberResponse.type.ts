import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class PhoneNumberResponse {
    @Field((type) => String)
    callingCountryCode: String;

    @Field((type) => String)
    public countryCode: String;
}
