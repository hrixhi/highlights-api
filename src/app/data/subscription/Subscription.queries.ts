import { Arg, Field, ObjectType } from 'type-graphql';
import { SubscriptionObject } from './types/Subscription.type';
import { SubscriptionModel } from './mongo/Subscription.model';

/**
 * Subscription Query Endpoints
 */
@ObjectType()
export class SubscriptionQueryResolver {

  @Field(type => [SubscriptionObject], {
    description: "Returns list of subscriptions belonging to a user.",
  })
  public async findByUserId(
    @Arg("userId", type => String)
    userId: string
  ) {
    try {
      return await SubscriptionModel.find({
        $and: [
          { userId },
          { keepContent: { $ne: false } }
        ]
      })
    } catch (e) {
      console.log(e)
      return []
    }
  }

  @Field(type => Boolean, {
    description: "Returns inactive status (T/F).",
  })
  public async isSubInactive(
    @Arg("userId", type => String)
    userId: string,
    @Arg("channelId", type => String)
    channelId: string
  ) {
    try {
      const sub = await SubscriptionModel.findOne({
        userId,
        channelId,
        unsubscribedAt: { $exists: false }
      })
      if (sub) {
        return sub.inactive ? true : false
      } else {
        return false
      }
    } catch (e) {
      console.log(e)
      return false
    }
  }

}