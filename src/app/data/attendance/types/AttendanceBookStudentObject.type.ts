import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';

@ObjectType()
class AttendanceBookEntryStudentObject {
    @Field((type) => String)
    public title: string;

    // REQUIRED
    @Field((type) => Date)
    public start: Date;

    @Field((type) => Date, { nullable: true })
    public end?: Date;

    @Field((type) => String, { nullable: true })
    public dateId?: string;

    @Field((type) => String, { nullable: true })
    public attendanceEntryId?: string;

    @Field((type) => String, { nullable: true })
    public recordingLink?: string;

    @Field((type) => String)
    public attendanceType: string;

    @Field((type) => Boolean)
    public late: boolean;

    @Field((type) => Boolean)
    public excused: boolean;

    @Field((type) => Date, { nullable: true })
    public joinedAt?: Date;

    @Field((type) => Date, { nullable: true })
    public leftAt?: Date;
}

@ObjectType()
class AttendanceBookTotalStudentObject {
    // TOTALS
    @Field((type) => Number)
    public totalAttendancesPossible: number;

    @Field((type) => Number)
    public totalPresent: number;

    @Field((type) => Number)
    public totalLate: number;

    @Field((type) => Number)
    public totalExcused: number;

    // LAST 30 DAYS
    @Field((type) => Number)
    public last30AttendancesPossible: number;

    @Field((type) => Number)
    public last30Present: number;

    @Field((type) => Number)
    public last30Late: number;

    @Field((type) => Number)
    public last30TotalExcused: number;

    // LAST 7 DAYS
    @Field((type) => Number)
    public last7AttendancesPossible: number;

    @Field((type) => Number)
    public last7Present: number;

    @Field((type) => Number)
    public last7Late: number;

    @Field((type) => Number)
    public last7TotalExcused: number;
}

@ObjectType()
export class AttendanceBookStudentObject {
    @Field((type) => [AttendanceBookEntryStudentObject])
    public entries: AttendanceBookEntryStudentObject[];

    @Field((type) => AttendanceBookTotalStudentObject)
    public total: AttendanceBookTotalStudentObject;
}
