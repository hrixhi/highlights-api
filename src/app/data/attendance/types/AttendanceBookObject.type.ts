import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';

@ObjectType()
class UserAttendanceBookObject {
    @Field((type) => String)
    public userId: string;

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
class AttendanceBookEntryObject {
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

    @Field((type) => [UserAttendanceBookObject])
    public attendances: UserAttendanceBookObject[];
}

@ObjectType()
class AttendanceBookUserObject {
    @Field((type) => String)
    public userId: string;

    @Field((type) => String)
    public fullName: string;

    @Field((type) => String, { nullable: true })
    public avatar?: string;
}

@ObjectType()
class AttendanceBookTotalObject {
    @Field((type) => String)
    public userId: string;

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
export class AttendanceBookObject {
    @Field((type) => [AttendanceBookEntryObject])
    public entries: AttendanceBookEntryObject[];

    @Field((type) => [AttendanceBookTotalObject])
    public totals: AttendanceBookTotalObject[];

    @Field((type) => [AttendanceBookUserObject])
    public users: AttendanceBookUserObject[];
}
