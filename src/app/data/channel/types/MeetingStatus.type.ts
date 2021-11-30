import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class MeetingStatusObject {
    @Field()
    public title: string;

    @Field()
    public description: string;

    @Field(type => String, { nullable: true })
    public startUrl: string;

    @Field()
    public joinUrl: string;

    @Field()
    public start: Date;

    @Field()
    public end: Date;

    @Field(type => String, { nullable: true })
    public error?: string;
}
