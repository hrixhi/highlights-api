import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class StreamChatMeetingObject {
    @Field((type) => String)
    public title: string;

    @Field((type) => String)
    public meetingId: string;

    @Field((type) => String)
    public meetingProvider: string;

    @Field((type) => String)
    public meetingJoinLink: string;

    @Field((type) => String)
    public meetingStartLink: string;

    @Field((type) => String)
    public start: string;

    @Field((type) => String)
    public end: string;
}
