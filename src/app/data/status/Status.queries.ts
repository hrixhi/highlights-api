// import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
// import { SubscriptionObject } from './types/Subscription.type';
// import { SubscriptionModel } from './mongo/Subscription.model';

// /**
//  * Subscription Query Endpoints
//  */
// @ObjectType()
// export class SubscriptionQueryResolver {

//   @Field(type => [SubscriptionObject], {
//     description: "Used to find one user by id."
//   })
//   public async findByUserId(
//     @Arg("userId", type => String)
//     userId: string
//   ) {
//     try {
//       return await SubscriptionModel.find({ userId })
//     } catch (e) {
//       console.log(e)
//       return []
//     }
//   }

// }