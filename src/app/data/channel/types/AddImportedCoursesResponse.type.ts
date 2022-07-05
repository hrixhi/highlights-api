import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AddImportedCoursesResponse {
    @Field((type) => [String])
    public success: string[];

    @Field((type) => [String])
    public failedToAdd: string[];

    @Field((type) => [String])
    public errors: string[];
}
