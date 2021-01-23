import { Arg, Ctx, Authorized, Field, ObjectType } from 'type-graphql';
import { Context } from 'graphql-yoga/dist/types';
import { UserModel } from '../user/mongo/User.model'

/**
 * User Mutation Endpoints
 */
@ObjectType()
export class CueMutationResolver {

	@Field(type => Boolean, {
		description: 'Used when you want to delete a user.'
	})
	public async endVisit(
		// @Arg('userId', type => String) userId: string
	) {
		return true;
	}

}
