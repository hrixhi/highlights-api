import { IUserModel } from '@app/data/user/mongo/User.model';
import { Context } from 'graphql-yoga/dist/types';

import { MongoRepositoriesFactory } from '../context/MongoRepositories';

export interface IGraphQLContext extends Context {
	user?: IUserModel;
	request?: any;
	repositories: MongoRepositoriesFactory;
}
