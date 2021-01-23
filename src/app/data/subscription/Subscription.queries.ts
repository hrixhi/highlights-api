import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { SubscriptionObject } from './types/Subscription.type';
import { SubscriptionModel } from './mongo/Subscription.model';
import { UserModel } from '../user/mongo/User.model'

/**
 * Log Query Endpoints
 */
@ObjectType()
export class SubscriptionQueryResolver {

  @Field(type => SubscriptionObject, {
    description: "Used to find one user by id."
  })
  public async findById(
    @Arg("id", type => String)
    id: string
  ) {
    const result: any = await SubscriptionModel.findById(id);
    return result;
  }

}