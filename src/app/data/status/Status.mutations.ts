import { Arg, Ctx, Authorized, Field, ObjectType } from 'type-graphql';
import { Context } from 'graphql-yoga/dist/types';
import { UserModel } from '../user/mongo/User.model'
import { StatusModel } from './mongo/Status.model';

/**
 * Status Mutation Endpoints
 */
@ObjectType()
export class StatusMutationResolver {

    @Field(type => Boolean, {
        description: 'Used when you want to delete a user.'
    })
    public async markAsRead(
        @Arg('userId', type => String) userId: string,
        @Arg('cueId', type => String) cueId: string
    ) {
        try {
            await StatusModel.updateOne({ userId, cueId }, { status: 'read' })
            return true;
        } catch (e) {
            return false
        }
    }

}
