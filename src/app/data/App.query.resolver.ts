import { Query, Resolver } from 'type-graphql'
import { UserQueryResolver } from './user/User.queries'
import { ChannelQueryResolver } from './channel/Channel.queries'
import { CueQueryResolver } from './cue/Cue.queries'
import { SubscriptionQueryResolver } from './subscription/Subscription.queries'
import { ThreadQueryResolver } from './thread/Thread.queries'
import { StatusQueryResolver } from './status/Status.queries'

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

}
