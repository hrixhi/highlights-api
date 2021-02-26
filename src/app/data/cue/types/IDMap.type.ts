import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class IDMapObject {

    @Field()
    public oldId: string;

    @Field()
    public newId: string;

}
