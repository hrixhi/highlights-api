import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { Ctx, Field, ObjectType } from 'type-graphql';
import { ModificationsModel } from '@app/data/modification/mongo/Modification.model';
import { CueModel } from '@app/data/cue/mongo/Cue.model';
import { UserModel } from '@app/data/user/mongo/User.model';
import { SchoolsModel } from '@app/data/school/mongo/School.model';
import { GroupModel } from '@app/data/group/mongo/Group.model';
import { ZoomRegistrationModel } from '@app/data/zoom-registration/mongo/zoom-registration.model';
import { StreamChat } from 'stream-chat';
import { STREAM_CHAT_API_KEY, STREAM_CHAT_API_SECRET } from '@config/StreamKeys';

@ObjectType()
export class EventObject {
    @Field((type) => String, { nullable: true })
    public async eventId() {
        const localThis: any = this;
        const { _id, dateId = '' } = localThis._doc || localThis;
        return _id ? _id : dateId;
    }

    @Field((type) => String, { nullable: true })
    public async title() {
        const localThis: any = this;
        const { title } = localThis._doc || localThis;
        return title ? title : '';
    }

    @Field()
    public start: Date;

    @Field()
    public end: Date;

    @Field((type) => String, { nullable: true })
    public async channelName() {
        const localThis: any = this;
        const { scheduledMeetingForChannelId } = localThis._doc || localThis;
        if (scheduledMeetingForChannelId) {
            const channel = await ChannelModel.findById(scheduledMeetingForChannelId);
            return channel ? channel.name : '';
        } else {
            return '';
        }
    }

    @Field((type) => String, { nullable: true })
    public async channelId() {
        const localThis: any = this;
        const { scheduledMeetingForChannelId } = localThis._doc || localThis;
        if (scheduledMeetingForChannelId) {
            return scheduledMeetingForChannelId ? scheduledMeetingForChannelId : '';
        } else {
            return '';
        }
    }

    @Field((type) => String, { nullable: true })
    public async createdBy(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { scheduledMeetingForChannelId, isNonChannelMeeting, zoomMeetingScheduledBy } =
            localThis._doc || localThis;
        if (scheduledMeetingForChannelId) {
            const channel = await ChannelModel.findById(scheduledMeetingForChannelId);

            if (channel && channel.owners && context.user && channel.createdBy !== context.user!._id) {
                const anotherOwner = channel.owners.find((item: any) => {
                    return item === context.user!._id.toString();
                });
                if (anotherOwner) {
                    return anotherOwner;
                }
            }

            return channel ? channel.createdBy : '';
        } else if (isNonChannelMeeting && zoomMeetingScheduledBy) {
            return zoomMeetingScheduledBy;
        } else {
            if (context.user && context.user!._id !== '') {
                return context.user!._id;
            }
            return '';
        }
    }

    @Field((type) => String, { nullable: true })
    public dateId?: string;

    @Field((type) => String, { nullable: true })
    public scheduledMeetingForChannelId?: string;

    @Field((type) => String, { nullable: true })
    public description?: string;

    @Field((type) => Boolean, { nullable: true })
    public recordMeeting?: boolean;

    @Field((type) => String, { nullable: true })
    public recordingLink?: string;

    @Field((type) => String, { nullable: true })
    public recurringId?: string;

    // ZOOM

    @Field((type) => String, { nullable: true })
    public zoomMeetingId?: string;

    @Field((type) => String, { nullable: true })
    public zoomStartUrl?: string;
    // public async zoomStartUrl(@Ctx() context: IGraphQLContext) {
    //     const localThis: any = this;
    //     const { scheduledMeetingForChannelId } = localThis._doc || localThis;

    //     const localDoc = localThis._doc || localThis;

    //     const zoomStart = localDoc.zoomStartUrl;

    //     if (zoomStart && zoomStart !== '') {
    //         const channel = await ChannelModel.findById(scheduledMeetingForChannelId);
    //         if (channel && channel.owners && context.user && channel.createdBy !== context.user!._id) {
    //             const anotherOwner = channel.owners.find((item: any) => {
    //                 return item === context.user!._id.toString();
    //             });
    //             if (anotherOwner) {
    //                 return zoomStart;
    //             }
    //         } else if (channel && channel.createdBy === context.user!._id) {
    //             return zoomStart;
    //         }

    //         return '';
    //     }
    //     return '';
    // }

    @Field((type) => String, { nullable: true })
    public async zoomMeetingCreatorProfile(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { zoomMeetingScheduledBy } = localThis._doc || localThis;
        if (zoomMeetingScheduledBy && zoomMeetingScheduledBy !== '') {
            const user = await UserModel.findById(zoomMeetingScheduledBy);

            if (user) {
                return user.fullName + ', ' + user.email;
            }

            return null;
        }
        return null;
    }

    @Field((type) => String, { nullable: true })
    public async creatorProfile(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { createdBy } = localThis._doc || localThis;
        if (createdBy && createdBy !== '') {
            const user = await UserModel.findById(createdBy);

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
        const { createdBy } = localThis._doc || localThis;
        if (createdBy && createdBy !== '') {
            const user = await UserModel.findById(createdBy);

            if (user && user.avatar) {
                return user.avatar;
            }

            return null;
        }
        return null;
    }

    @Field((type) => String, { nullable: true })
    public zoomJoinUrl?: string;

    @Field((type) => String, { nullable: true })
    public async zoomRegistrationJoinUrl(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { isNonChannelMeeting, scheduledMeetingForChannelId, zoomJoinUrl, zoomMeetingId } =
            localThis._doc || localThis;

        if (!zoomJoinUrl || zoomJoinUrl === '') return null;

        if (isNonChannelMeeting) {
            return zoomJoinUrl;
        } else if (scheduledMeetingForChannelId && scheduledMeetingForChannelId !== '') {
            if (!context.user || context.user!._id === '') return null;

            // Check if registration link exist
            const registration = await ZoomRegistrationModel.findOne({
                userId: context.user._id,
                channelId: scheduledMeetingForChannelId,
                zoomMeetingId,
            });

            if (registration) {
                return registration.zoom_join_url;
            } else {
                return zoomJoinUrl;
            }
        }
        return null;
    }

    @Field((type) => String, { nullable: true })
    public zoomMeetingScheduledBy?: string;

    @Field((type) => String, { nullable: true })
    public cueId?: string;

    @Field((type) => Boolean, { nullable: true })
    public meeting?: boolean;

    @Field((type) => Boolean, { nullable: true })
    public async submitted(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { cueId } = localThis._doc || localThis;
        if (cueId && cueId !== '' && context.user) {
            const cue = await CueModel.findOne({
                _id: cueId,
            });

            if (!cue) return null;

            const mod = await ModificationsModel.findOne({
                cueId,
                userId: context.user!._id,
            });

            if (!mod) return null;

            if (cue.submission) {
                return mod.submittedAt ? true : false;
            }
        }

        return null;
    }

    @Field((type) => String, { nullable: true })
    public async meetingLink() {
        const localThis: any = this;
        const { userId, scheduledMeetingForChannelId } = localThis._doc || localThis;

        const findUser = await UserModel.findById(userId);

        if (!findUser || !findUser.schoolId) return null;

        const org = await SchoolsModel.findById(findUser.schoolId);

        if (org && org.meetingProvider && org.meetingProvider !== '') {
            const course = await ChannelModel.findById(scheduledMeetingForChannelId);

            if (course && course.meetingUrl) {
                return course.meetingUrl;
            }

            return null;
        } else {
            return null;
        }
    }

    @Field((type) => Boolean, { nullable: true })
    public isNonChannelMeeting?: boolean;

    @Field((type) => String, { nullable: true })
    public nonChannelGroupId?: string;

    @Field((type) => String, { nullable: true })
    public async groupUsername() {
        const localThis: any = this;
        const { userId, isNonChannelMeeting, nonChannelGroupId } = localThis._doc || localThis;

        const serverClient = StreamChat.getInstance(STREAM_CHAT_API_KEY, STREAM_CHAT_API_SECRET);

        const channel = await serverClient.channel('messaging', nonChannelGroupId);

        if (channel) {
            const members = Object.values(channel.state.members).filter(({ user }) => user?.id !== userId);

            console.log('Members group username', members);

            const memberNames = members.map((member: any) => {
                return member.user?.name;
            });

            console.log('group Username', channel.data?.name ? channel.data?.name : memberNames.join(' <> '));

            return channel.data?.name ? channel.data?.name : memberNames.join(' <> ');
        }

        return '';
    }

    // School events
    @Field((type) => String, { nullable: true })
    public schoolId?: string;

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

    @Field((type) => Boolean, { nullable: true })
    public shareWithAllInstructors?: boolean;

    @Field((type) => [String], { nullable: true })
    public selectedInstructors?: string[];

    @Field((type) => Boolean, { nullable: true })
    public shareWithAllAdmins?: boolean;

    @Field((type) => [String], { nullable: true })
    public selectedAdmins?: string[];
}

@ObjectType()
export class LectureRecording {
    @Field((type) => String, { nullable: true })
    public recordID: string;

    @Field((type) => String, { nullable: true })
    public url?: string;

    @Field((type) => Date, { nullable: true })
    public startTime?: Date;

    @Field((type) => Date, { nullable: true })
    public endTime?: Date;

    @Field((type) => String, { nullable: true })
    public thumbnail?: string;
}

@ObjectType()
export class UserSelection {
    @Field((type) => String)
    public _id: string;

    @Field((type) => String)
    public fullName: string;

    @Field((type) => String)
    public email: string;

    @Field((type) => String)
    public role: string;

    @Field((type) => String)
    public grade: string;

    @Field((type) => String)
    public section: string;
}
