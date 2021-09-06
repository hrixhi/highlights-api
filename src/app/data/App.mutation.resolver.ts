import { Mutation, Resolver } from 'type-graphql'
import { UserMutationResolver } from './user/User.mutations'
import { ChannelMutationResolver } from './channel/Channel.mutations'
import { CueMutationResolver } from './cue/Cue.mutations'
import { SubscriptionMutationResolver } from './subscription/Subscription.mutations'
import { StatusMutationResolver } from './status/Status.mutations'
import { ThreadMutationResolver } from './thread/Thread.mutations'
import { MessageMutationResolver } from './message/Message.mutations'
import { MessageStatusMutationResolver } from './message-status/MessageStatus.mutations'
import { ThreadStatusMutationResolver } from './thread-status/ThreadStatus.mutations'
import { DateMutationResolver } from './dates/Date.mutations'
import { AttendanceMutationResolver } from './attendance/Attendance.mutations'
import { QuizMutationResolver } from './quiz/Quiz.mutations'
import { SchoolMutationResolver } from './school/School.mutations'
import { FolderMutationResolver } from './folder/Folder.mutations'

@Resolver()
export class AppMutationResolver {

  @Mutation(returns => UserMutationResolver)
  public user() {
    return new UserMutationResolver()
  }

  @Mutation(returns => ChannelMutationResolver)
  public channel() {
    return new ChannelMutationResolver()
  }

  @Mutation(returns => CueMutationResolver)
  public cue() {
    return new CueMutationResolver()
  }

  @Mutation(returns => SubscriptionMutationResolver)
  public subscription() {
    return new SubscriptionMutationResolver()
  }

  @Mutation(returns => StatusMutationResolver)
  public status() {
    return new StatusMutationResolver()
  }

  @Mutation(returns => ThreadMutationResolver)
  public thread() {
    return new ThreadMutationResolver
  }

  @Mutation(returns => MessageMutationResolver)
  public message() {
    return new MessageMutationResolver()
  }

  @Mutation(returns => MessageStatusMutationResolver)
  public messageStatus() {
    return new MessageStatusMutationResolver();
  }

  @Mutation(returns => ThreadStatusMutationResolver)
  public threadStatus() {
    return new ThreadStatusMutationResolver();
  }

  @Mutation(returns => DateMutationResolver)
  public date() {
    return new DateMutationResolver();
  }

  @Mutation(returns => AttendanceMutationResolver)
  public attendance() {
    return new AttendanceMutationResolver();
  }

  @Mutation(returns => QuizMutationResolver)
  public quiz() {
    return new QuizMutationResolver();
  }

  @Mutation(returns => SchoolMutationResolver)
  public school() {
    return new SchoolMutationResolver();
  }

  @Mutation(returns => FolderMutationResolver)
  public folder() {
    return new FolderMutationResolver();
  }

}
