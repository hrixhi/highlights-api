import { Mutation, Resolver } from 'type-graphql';
import { UserMutationResolver } from './user/User.mutations';
import { ChannelMutationResolver } from './channel/Channel.mutations';
import { CueMutationResolver } from './cue/Cue.mutations';
import { SubscriptionMutationResolver } from './subscription/Subscription.mutations';
import { StatusMutationResolver } from './status/Status.mutations';
import { ThreadMutationResolver } from './thread/Thread.mutations';
import { MessageMutationResolver } from './message/Message.mutations';
import { MessageStatusMutationResolver } from './message-status/MessageStatus.mutations';
import { ThreadStatusMutationResolver } from './thread-status/ThreadStatus.mutations';
import { DateMutationResolver } from './dates/Date.mutations';
import { AttendanceMutationResolver } from './attendance/Attendance.mutations';
import { QuizMutationResolver } from './quiz/Quiz.mutations';
import { SchoolMutationResolver } from './school/School.mutations';
import { FolderMutationResolver } from './folder/Folder.mutations';
import { ActivityMutationResolver } from './activity/activity.mutations';
import { AnnouncementMutationResolver } from './announcement/Announcement.mutations';
import { AcademicTermMutationResolver } from './academic-term/AcademicTerm.mutations';
import { FeePlanMutationResolver } from './fee-plan/FeePlan.mutations';
import { GradingScaleMutationResolver } from './grading-scale/GradingScale.mutation';
import { GradebookEntryMutationResolver } from './gradebook-entries/GradebookEntry.mutations';
import { StandardsMutationResolver } from './standards/Standards.mutation';
import { StreamChatMutationResolver } from './stream-chat/StreamChat.mutations';

@Resolver()
export class AppMutationResolver {
    @Mutation((returns) => UserMutationResolver)
    public user() {
        return new UserMutationResolver();
    }

    @Mutation((returns) => ChannelMutationResolver)
    public channel() {
        return new ChannelMutationResolver();
    }

    @Mutation((returns) => CueMutationResolver)
    public cue() {
        return new CueMutationResolver();
    }

    @Mutation((returns) => SubscriptionMutationResolver)
    public subscription() {
        return new SubscriptionMutationResolver();
    }

    @Mutation((returns) => StatusMutationResolver)
    public status() {
        return new StatusMutationResolver();
    }

    @Mutation((returns) => ThreadMutationResolver)
    public thread() {
        return new ThreadMutationResolver();
    }

    @Mutation((returns) => MessageMutationResolver)
    public message() {
        return new MessageMutationResolver();
    }

    @Mutation((returns) => MessageStatusMutationResolver)
    public messageStatus() {
        return new MessageStatusMutationResolver();
    }

    @Mutation((returns) => ThreadStatusMutationResolver)
    public threadStatus() {
        return new ThreadStatusMutationResolver();
    }

    @Mutation((returns) => DateMutationResolver)
    public date() {
        return new DateMutationResolver();
    }

    @Mutation((returns) => AttendanceMutationResolver)
    public attendance() {
        return new AttendanceMutationResolver();
    }

    @Mutation((returns) => QuizMutationResolver)
    public quiz() {
        return new QuizMutationResolver();
    }

    @Mutation((returns) => SchoolMutationResolver)
    public school() {
        return new SchoolMutationResolver();
    }

    @Mutation((returns) => FolderMutationResolver)
    public folder() {
        return new FolderMutationResolver();
    }

    @Mutation((returns) => ActivityMutationResolver)
    public activity() {
        return new ActivityMutationResolver();
    }

    @Mutation((returns) => AnnouncementMutationResolver)
    public announcements() {
        return new AnnouncementMutationResolver();
    }

    @Mutation((returns) => AcademicTermMutationResolver)
    public academicTerms() {
        return new AcademicTermMutationResolver();
    }

    @Mutation((returns) => FeePlanMutationResolver)
    public feePlans() {
        return new FeePlanMutationResolver();
    }

    @Mutation((returns) => GradingScaleMutationResolver)
    public gradingScales() {
        return new GradingScaleMutationResolver();
    }

    @Mutation((returns) => GradebookEntryMutationResolver)
    public gradebook() {
        return new GradebookEntryMutationResolver();
    }

    @Mutation((returns) => StandardsMutationResolver)
    public standards() {
        return new StandardsMutationResolver();
    }

    @Mutation((returns) => StreamChatMutationResolver)
    public streamChat() {
        return new StreamChatMutationResolver();
    }
}
