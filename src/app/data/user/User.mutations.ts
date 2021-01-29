import { hashPassword } from '@app/data/methods';
import { UserModel } from '@app/data/user/mongo/User.model';
import { Arg, Ctx, Authorized, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '../../server/interfaces/Context.interface';
import { UserObject } from './types/User.type';

/**
 * User Mutation Endpoints
 */
@ObjectType()
export class UserMutationResolver {

	@Field(type => UserObject, {
		description: 'Used when you want to create user.',
		nullable: true
	})
	public async create(
		@Arg('fullName', type => String)
		fullName: string,
		@Arg('displayName', type => String)
		displayName: string,
		@Arg('notificationId', type => String)
		notificationId: string
	) {

		try {
			return await UserModel.create({
				fullName,
				notificationId,
				displayName
			})
		} catch (e) {
			console.log(e)
			return null
		}
	}

	@Field(type => Boolean, {
		description: 'Used when you want to update a user.',
		nullable: true
	})
	public async update(
		@Arg('fullName', type => String)
		fullName: string,
		@Arg('displayName', type => String)
		displayName: string,
		@Arg('userId', type => String)
		userId: string
	) {
		try {
			await UserModel.updateOne(
				{ _id: userId },
				{
					fullName,
					displayName
				})
			return true
		} catch (e) {
			console.log(e)
			return false
		}
	}

}
