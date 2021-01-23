import { Mutation, Resolver } from 'type-graphql'
import { UserMutationResolver } from './user/User.mutations'
import { ChannelMutationResolver } from './channel/Channel.mutations'
import { CueMutationResolver } from './cue/Cue.mutations'
import { SubscriptionMutationResolver } from './subscription/Subscription.mutations'

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

}
