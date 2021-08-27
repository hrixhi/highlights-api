// import { Arg, Field, ObjectType } from 'type-graphql';
// import { MessageStatusModel } from './mongo/activity.model';

// /**
//  * Message Status Mutation Endpoints
//  */
// @ObjectType()
// export class MessageStatusMutationResolver {

//     @Field(type => Boolean, {
//         description: 'Used when you want to update unread messages count.'
//     })
//     public async markMessagesAsRead(
//         @Arg('userId', type => String) userId: string,
//         @Arg('groupId', type => String) groupId: string,
//     ) {
//         try {
//             await MessageStatusModel.deleteMany({ userId, groupId })
//             return true;
//         } catch (e) {
//             return false
//         }
//     }

// }
