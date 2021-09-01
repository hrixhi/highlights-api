import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { DateModel } from '@app/data/dates/mongo/dates.model';
import { Field, ObjectType } from 'type-graphql';



@ObjectType()
export class UserAttendanceObject {

    @Field()
    public userId: string;

    @Field()
    public dateId: string;

    @Field(type => Date, { nullable: true })
    public joinedAt: Date;

}

@ObjectType()
export class ChannelAttendanceObject {

    @Field()
    public userId: string;

    @Field(type => String)
    public displayName: string;

    @Field(type => String)
    public fullName: string

    @Field(type => String, { nullable: true })
    public email: string

    @Field(type => [UserAttendanceObject])
    public attendances: UserAttendanceObject[];

}