import { Field, InputType } from 'type-graphql';

@InputType()
class AttendanceUserInput {
    @Field((type) => String)
    public userId: string;

    @Field((type) => String)
    attendanceType: string;

    @Field((type) => Boolean)
    late: boolean;

    @Field((type) => Boolean)
    excused: boolean;
}

@InputType()
export class NewAttendanceEntryInput {
    @Field((type) => String)
    public title: string;

    @Field((type) => Date)
    public date: Date;

    @Field((type) => String, { nullable: true })
    public recordingLink?: string;

    @Field((type) => String)
    public channelId: string;

    @Field((type) => [AttendanceUserInput])
    public attendances: AttendanceUserInput[];
}
