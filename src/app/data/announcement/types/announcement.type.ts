import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { UserModel } from '@app/data/user/mongo/User.model';
import { UserSelection } from '@app/data/dates/types/Date.type';

@ObjectType()
export class AnnouncementObject {
    @Field((type) => String)
    public _id: string;

    @Field((type) => String)
    public title: string;

    @Field((type) => String)
    public description: string;

    @Field((type) => String)
    public userId: string;

    @Field((type) => String)
    public schoolId: string;

    @Field((type) => Boolean, { nullable: true })
    public isNonMeetingSchoolEvent?: boolean;

    @Field((type) => String, { nullable: true })
    public selectedSegment?: string;

    @Field((type) => Boolean, { nullable: true })
    public allGradesAndSections?: boolean;

    @Field((type) => Boolean, { nullable: true })
    public allUsersSelected?: boolean;

    @Field((type) => [String], { nullable: true })
    public shareWithGradesAndSections?: string[];

    @Field((type) => [String], { nullable: true })
    public selectedUsers?: string[];

    @Field((type) => Boolean, { nullable: true })
    public shareWithAllInstructors?: boolean;

    @Field((type) => [String], { nullable: true })
    public selectedInstructors?: string[];

    @Field((type) => Boolean, { nullable: true })
    public shareWithAllAdmins?: boolean;

    @Field((type) => [String], { nullable: true })
    public selectedAdmins?: string[];

    @Field((type) => Date)
    public createdAt: Date;

    @Field((type) => String, { nullable: true })
    public async creatorProfile(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { userId } = localThis._doc || localThis;
        if (userId && userId !== '') {
            const user = await UserModel.findById(userId);

            if (user) {
                return user.fullName + ', ' + user.email;
            }

            return null;
        }
        return null;
    }

    @Field((type) => String, { nullable: true })
    public async creatorAvatar(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { userId } = localThis._doc || localThis;
        if (userId && userId !== '') {
            const user = await UserModel.findById(userId);

            if (user && user.avatar) {
                return user.avatar;
            }

            return null;
        }
        return null;
    }

    @Field((type) => [UserSelection], { nullable: true })
    public async allSelections() {
        const localThis: any = this;
        const { selectedUsers } = localThis._doc || localThis;

        if (selectedUsers) {
            const fetchUsers = await UserModel.find({
                _id: { $in: selectedUsers },
                deletedAt: undefined,
            });

            // Customize for parents to return Grade and section of their kid
            const users = fetchUsers.map((user: any) => {
                return {
                    _id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    grade: user.grade,
                    section: user.section,
                };
            });

            return users;
        }

        return null;
    }
}
