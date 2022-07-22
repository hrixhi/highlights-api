import { Field, InputType } from 'type-graphql';

@InputType()
export class EditAnnouncementInputAdmin {
    @Field((type) => String)
    public id: string;

    @Field((type) => String)
    public title: string;

    @Field((type) => String, { nullable: true })
    public description: string;

    // SHARE OPTIONS AND SELECTIONS FOR USERS
    @Field((type) => String, { nullable: true })
    public selectedSegment?: string;

    @Field((type) => Boolean, { nullable: true })
    public allGradesAndSections?: boolean;

    @Field((type) => Boolean, { nullable: true })
    public allUsersSelected?: boolean;

    // SELECTED GRADES AND SECTIONS AS 10-A, 10-B
    @Field((type) => [String], { nullable: true })
    public shareWithGradesAndSections?: string[];

    // IDS OF SELECTED USERS
    @Field((type) => [String], { nullable: true })
    public selectedUsers?: string[];

    // Instructors
    @Field((type) => Boolean, { nullable: true })
    public shareWithAllInstructors?: boolean;

    @Field((type) => [String], { nullable: true })
    public selectedInstructors?: string[];

    // Admins
    @Field((type) => Boolean, { nullable: true })
    public shareWithAllAdmins?: boolean;

    @Field((type) => [String], { nullable: true })
    public selectedAdmins?: string[];
}
