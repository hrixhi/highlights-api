import { Query, Resolver } from 'type-graphql'
import { UserQueryResolver } from './user/User.queries'
import { ChannelQueryResolver } from './channel/Channel.queries'
import { CueQueryResolver } from './cue/Cue.queries'
import { SubscriptionQueryResolver } from './subscription/Subscription.queries'
import { ThreadQueryResolver } from './thread/Thread.queries'
import { StatusQueryResolver } from './status/Status.queries'
import { MessageQueryResolver } from './message/Message.queries'
import { MessageStatusQueryResolver } from './message-status/MessageStatus.queries'
import { ThreadStatusQueryResolver } from './thread-status/ThreadStatus.queries'
import { DateQueryResolver } from './dates/Date.queries'
import { GroupQueryResolver } from './group/Group.queries'
import { AttendanceQueryResolver } from './attendance/Attendance.queries'
import { QuizQueryResolver } from './quiz/Quiz.queries'
import { SchoolQueryResolver } from './school/School.queries'
import { ActivityQueryResolver } from './activity/activity.queries'
import { FolderQueryResolver } from './folder/Folder.queries'

@Resolver()
export class AppQueryResolver {
  @Query(returns => UserQueryResolver)
  public user() {
    return new UserQueryResolver()
  }

  @Query(returns => ChannelQueryResolver)
  public channel() {
    return new ChannelQueryResolver()
  }

  @Query(returns => CueQueryResolver)
  public cue() {
    return new CueQueryResolver()
  }

  @Query(returns => SubscriptionQueryResolver)
  public subscription() {
    return new SubscriptionQueryResolver()
  }

  @Query(returns => ThreadQueryResolver)
  public thread() {
    return new ThreadQueryResolver
  }

  @Query(returns => StatusQueryResolver)
  public status() {
    return new StatusQueryResolver
  }

  @Query(returns => MessageQueryResolver)
  public message() {
    return new MessageQueryResolver()
  }

  @Query(returns => MessageStatusQueryResolver)
  public messageStatus() {
    return new MessageStatusQueryResolver()
  }

  @Query(returns => ThreadStatusQueryResolver)
  public threadStatus() {
    return new ThreadStatusQueryResolver();
  }

  @Query(returns => DateQueryResolver)
  public date() {
    return new DateQueryResolver();
  }

  @Query(returns => GroupQueryResolver)
  public group() {
    return new GroupQueryResolver();
  }

  @Query(returns => AttendanceQueryResolver)
  public attendance() {
    return new AttendanceQueryResolver();
  }

  @Query(returns => QuizQueryResolver)
  public quiz() {
    return new QuizQueryResolver();
  }

  @Query(returns => SchoolQueryResolver)
  public school() {
    return new SchoolQueryResolver();
  }

  @Query(returns => ActivityQueryResolver)
  public activity() {
    return new ActivityQueryResolver();
  }

  @Query(returns => FolderQueryResolver)
  public folder() {
    return new FolderQueryResolver();
  }

}
