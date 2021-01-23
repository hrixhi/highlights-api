import { Arg, Ctx, Authorized, Field, ObjectType } from 'type-graphql';
import { Context } from 'graphql-yoga/dist/types';
import { ChannelModel } from './mongo/Channel.model'
import { UserModel } from '../user/mongo/User.model'
import { CueModel } from '../cue/mongo/Cue.model';
import { IGraphQLContext } from '../../server/interfaces/Context.interface';

/**
 * Channel Mutation Endpoints
 */
@ObjectType()
export class ChannelMutationResolver {
	
	@Field(type => Boolean, {
		description: 'Used when you want to delete a user.'
	})
	public async create(
		@Arg('name', type => String) name: string,
		@Arg('createdBy', type => String) createdBy: string,
		@Arg('password', type => String) password: string,
		@Ctx() context: IGraphQLContext,
	) {
		return true;
	}

}
