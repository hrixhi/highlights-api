import { UserModel } from '@app/data/user/mongo/User.model';
import { Arg, Field, ObjectType } from 'type-graphql';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { UserObject } from './types/User.type';

/**
 * User Query Endpoints
 */
@ObjectType()
export class UserQueryResolver {

  @Field(type => UserObject, {
    description: "Returns a user by id.",
    nullable: true
  })
  public async findById(
    @Arg("id", type => String)
    id: string
  ) {
    const result: any = await UserModel.findById(id)
    return result;
  }

  @Field(type => [UserObject], {
    description: "Returns list of users by channelId."
  })
  public async findByChannelId(
    @Arg("channelId", type => String)
    channelId: string
  ) {
    try {
      const subscriptions = await SubscriptionModel.find({
        $and: [{ channelId }, { unsubscribedAt: { $exists: false } }]
      })
      const ids: any[] = []
      subscriptions.map((subscriber) => {
        ids.push(subscriber.userId)
      })
      return await UserModel.find({ _id: { $in: ids } })
    } catch (e) {
      console.log(e)
      return []
    }
  }

}