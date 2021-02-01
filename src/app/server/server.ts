import { UserModel } from '@app/data/user/mongo/User.model';
import { initializeServerExtensions } from '@app/server/methods/InitExtensions';
// import { initReports } from '@app/server/methods/InitReports';
import { Publisher } from '@app/server/publisher/publisher'
import cors from '@config/cors';
// import { PermissionManager } from '@helper/permissions/PermissionManager';
import { MongoDBService } from '@service/MongoDB/mongodb.service';
import chalk from 'chalk';
import { GraphQLServer } from 'graphql-yoga';
import { buildSchema } from 'type-graphql';
import graphqlConfig from '../../configs/graphql';
import { MongoRepositoriesFactory } from './context/MongoRepositories';
import { resolveUser } from './context/ResolveUser';
import { authChecker } from './methods/AuthChecker';
import { initializeAuthentication } from './methods/InitAuth';
// import { initializeRoutes } from './methods/InitRoutes';
import { PubSubNew } from './PubSub'

/**
 *  The most fundamental class that is the beginning to the working of the Isotope API
 */
export class Server {

	// Private variables used
	private graphqlServer?: any;
	private pubSub: PubSubNew;
	private publisher: Publisher;
	private graphqlSchema?: any;
	private mongoConnection?: any;

	/**
	 *  Constructor makes calls to most of the async functions described below
	 */
	constructor() {
		if (!this.graphqlServer) {
			// Connect to mongo
			this.connectToMongo().then(mongoConnection => {
				process.stdout.write('\n');
				process.stdout.write(
					chalk.green('[Bootstraping]') +
					chalk.whiteBright(' Connection to MongoDB done... \n'),
				);
				this.mongoConnection = mongoConnection;
				// Bootstrap the graphql schema
				this.boostrapGraphql().then(gqlSchema => {
					this.graphqlSchema = gqlSchema;
					process.stdout.write(
						chalk.green('[Bootstraping]') +
						chalk.whiteBright(' GraphQL Schema done... \n'),
					);
					// Start initialisation of GraphQL Server
					this.initializeGraphQL();
					// Start of GraphQL Server
					this.startGraphQLServer();
				});
			});
		}
	}

	/**
	 * Connects to Mongodb using a helper object
	 */
	private async connectToMongo() {
		return await MongoDBService.connect().then(
			(mongoConnection: any) => mongoConnection,
		);
	}

	/**
	 * Creates GraphQL Schema from types & resolvers and launching the WS communication object.
	 */
	private async boostrapGraphql() {
		// This is where 
		try {
			this.pubSub = await new PubSubNew();
			this.pubSub.changeMax();
			this.publisher = new Publisher(this.pubSub);
			this.graphqlSchema = await buildSchema({
				resolvers: [__dirname + '/../**/*.resolver.ts'],
				authChecker,
				pubSub: this.pubSub,
			});
		} catch (e) {
			throw e;
		}
		return this.graphqlSchema;
	}

	/**
	 * Initializes GQL elements used later on in queries and mutations
	 */
	private initializeGraphQL() {
		// Step 1 - Launch a GQL server instance with fundamental elements required later on by queries and mutations
		this.graphqlServer = new GraphQLServer({
			schema: this.graphqlSchema,
			context: async (req) => {
				let user = null
				const userId = req.request.header("userId")
				if (userId !== '') {
					user = await UserModel.findById(userId)
				}
				return {
					mongodb: this.mongoConnection,
					repositories: new MongoRepositoriesFactory(),
					user,
					publisher: this.publisher
				}
			},
			middlewares: [],
		});

		process.stdout.write(
			chalk.green('[Bootstraping]') +
			chalk.whiteBright(' GraphQL Server initialized..... \n'),
		);
	}

	/**
	 * Run the GQL Server after initialization
	 */
	private startGraphQLServer() {
		// Starting the GraphQL Server
		try {
			this.graphqlServer.start({
				cors,
				debug: graphqlConfig.debug,
				port: graphqlConfig.port,
				playground: graphqlConfig.playground,
				subscriptions: graphqlConfig.subscriptions,
				bodyParserOptions: graphqlConfig.bodyParserOptions,
				uploads: graphqlConfig.uploads
			});
		} catch (e) {
			throw e;
		}

		// Printing basic endpoint information to the console
		process.stdout.write(
			chalk.green('[Bootstraping]') +
			chalk.whiteBright(' GraphQL Server started..... \n'),
		);
		process.stdout.write('\n');
		process.stdout.write(
			chalk.green('[GraphQL]') +
			chalk.whiteBright(' running at port ') +
			chalk.green(String(graphqlConfig.port)) +
			chalk.whiteBright(' , endpoint ') +
			chalk.green(graphqlConfig.endpoint) +
			'   \n',
		);
		process.stdout.write(
			chalk.green('[GraphQL]') +
			chalk.whiteBright(' Subscriptions are at port ') +
			chalk.green(String(graphqlConfig.subscriptions.port)) +
			chalk.whiteBright(' , endpoint ') +
			// chalk.green(graphqlConfig.subscriptions.endpoint) +
			'   \n',
		);
		process.stdout.write(
			chalk.green('[GraphQL]') +
			chalk.whiteBright(' playground is at endpoint ') +
			graphqlConfig.playground +
			'   \n',
		);
		process.stdout.write(
			chalk.green('[GraphQL]') +
			chalk.whiteBright(' playground is at endpoint ') +
			' /voyager \n',
		);
	}
}
