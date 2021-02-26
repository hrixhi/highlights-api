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

	@Field(type => Boolean)
	public async signup(
		@Arg('fullName', type => String)
		fullName: string,
		@Arg('displayName', type => String)
		displayName: string,
		@Arg('userId', type => String)
		userId: string,
		@Arg('email', type => String)
		email: string,
		@Arg('password', type => String)
		password: string
	) {
		try {
			const hash = await hashPassword(password)
			await UserModel.updateOne(
				{ _id: userId },
				{
					fullName,
					displayName,
					password: hash,
					email
				})
			return true
		} catch (e) {
			console.log(e)
			return false
		}
	}

	@Field(type => Boolean)
	public async saveConfigToCloud(
		@Arg('sleepFrom', type => String)
		sleepFrom: string,
		@Arg('sleepTo', type => String)
		sleepTo: string,
		@Arg('randomShuffleFrequency', type => String)
		randomShuffleFrequency: string,
		@Arg('userId', type => String)
		userId: string,
		// @Arg('subscriptions', type => [String])
		// subscriptions: string[],
		@Arg('currentDraft', { nullable: true })
		currentDraft?: string,
	) {
		try {
			await UserModel.updateOne(
				{ _id: userId },
				{
					sleepTo,
					sleepFrom,
					randomShuffleFrequency,
					currentDraft,
					// subscriptions
				})
			return true
		} catch (e) {
			console.log(e)
			return false
		}
	}

}
