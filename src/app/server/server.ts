import { UserModel } from '@app/data/user/mongo/User.model';
import { Publisher } from '@app/server/publisher/publisher';
import cors from '@config/cors';
import { MongoDBService } from '@service/MongoDB/mongodb.service';
import chalk from 'chalk';
import { GraphQLServer } from 'graphql-yoga';
import { buildSchema } from 'type-graphql';
import graphqlConfig from '../../configs/graphql';
import { MongoRepositoriesFactory } from './context/MongoRepositories';
import { initializeRoutes } from './methods/InitRoutes';
import { initializeServerExtensions } from './methods/InitExtensions';
import { PubSubNew } from './PubSub';
import { ModificationsModel } from '@app/data/modification/mongo/Modification.model';
import { CueModel } from '@app/data/cue/mongo/Cue.model';
import { QuizModel } from '@app/data/quiz/mongo/Quiz.model';
import * as OneSignal from 'onesignal-node';
import { resolveUser } from './context/ResolveUser';

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
            this.connectToMongo().then((mongoConnection) => {
                process.stdout.write('\n');
                process.stdout.write(
                    chalk.green('[Bootstraping]') + chalk.whiteBright(' Connection to MongoDB done... \n')
                );
                this.mongoConnection = mongoConnection;
                // Bootstrap the graphql schema
                this.boostrapGraphql().then((gqlSchema) => {
                    this.graphqlSchema = gqlSchema;
                    process.stdout.write(
                        chalk.green('[Bootstraping]') + chalk.whiteBright(' GraphQL Schema done... \n')
                    );
                    // Start initialisation of GraphQL Server
                    this.initializeGraphQL();
                    // Start of GraphQL Server
                    this.startGraphQLServer();
                });
            });
            // set timer function
            var d = new Date();
            var epoch = d.getTime() / 1000;
            var secondsSinceLastTimerTrigger = epoch % 120; // (2 minutes)
            var secondsUntilNextTimerTrigger = 120 - secondsSinceLastTimerTrigger;
            // setInterval(this.submitQuizCheck, secondsUntilNextTimerTrigger * 1000);
        }
    }

    private async submitQuizCheck() {
        // get modifications with deadline where quizId is there and are not graded
        let time = new Date();
        time.setMinutes(time.getMinutes() - 2);
        const cues = await CueModel.find({
            submission: true,
            channelId: { $exists: true },
            deadline: { $lte: time },
            cue: { $regex: /{"quizId":"/ },
        });
        // get mods and grade them
        cues.map(async (c: any) => {
            const cue = c.toObject();
            const obj = JSON.parse(cue.cue);
            const quizId = obj.quizId;
            const quizDoc: any = await QuizModel.findById(quizId);
            const quiz = quizDoc.toObject();
            const mods = await ModificationsModel.find({
                cue: { $ne: '' },
                cueId: cue._id,
                submittedAt: { $exists: false },
            });
            mods.map(async (m: any) => {
                try {
                    const mod = m.toObject();
                    if (mod.userId.toString().trim() === cue.createdBy.toString().trim()) {
                        // owner
                        return;
                    }
                    const solutionsObject = JSON.parse(mod.cue);
                    if (!solutionsObject.solutions || solutionsObject.solutions.length === 0) {
                        return;
                    }
                    const solutions = solutionsObject.solutions;
                    // grade submission over here
                    let score = 0;
                    let total = 0;
                    quiz.problems.map((problem: any, i: any) => {
                        total += problem.points !== null && problem.points !== undefined ? problem.points : 1;
                        let correctAnswers = 0;
                        let totalAnswers = 0;
                        problem.options.map((option: any, j: any) => {
                            if (option.isCorrect && solutions[i].selected[j].isSelected) {
                                // correct answers
                                correctAnswers += 1;
                            }
                            if (option.isCorrect) {
                                // total correct answers
                                totalAnswers += 1;
                            }
                            if (!option.isCorrect && solutions[i].selected[j].isSelected) {
                                // to deduct points if answer is not correct but selected
                                totalAnswers += 1;
                            }
                        });
                        score += Number(
                            (
                                (correctAnswers / totalAnswers) *
                                (problem.points !== undefined && problem.points !== null ? problem.points : 1)
                            ).toFixed(2)
                        );
                    });
                    await ModificationsModel.updateOne(
                        { _id: mod._id },
                        { submittedAt: new Date(), graded: true, score: Number(((score / total) * 100).toFixed(2)) }
                    );
                    // DO NOTIFICATIONTHING OVER HERE !!!
                    // SEDN ONLY TO THE PERSON WHO's ACCOUNT IS LINKED
                } catch (e) {
                    console.log(e);
                }
            });
        });
    }

    /**
     * Connects to Mongodb using a helper object
     */
    private async connectToMongo() {
        return await MongoDBService.connect().then((mongoConnection: any) => mongoConnection);
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
                // authChecker,
                pubSub: this.pubSub,
                validate: false,
            });
        } catch (e) {
            throw e;
        }
        return this.graphqlSchema;
    }

    // This middleware checks if user was found using jwt token while creating context
    isLoggedIn = async (resolve: any, root: any, args: any, ctx: any, info: any) => {
        if (!ctx.user) {
            return new Error('NOT_AUTHENTICATED');
        }

        // Check if user has been removed or made inactive
        if (ctx.user) {
            if (ctx.user.deletedAt || ctx.user.inactive) {
                return new Error('NOT_AUTHENTICATED');
            }
        }

        return resolve();
    };

    //  This object assigns all the necessary resolver, queries and mutations with the isLoggedIn middleware
    private requiresAuthentication = {
        Query: {
            // activity: this.isLoggedIn,
            attendance: this.isLoggedIn,
            // channel: this.isLoggedIn,
            cue: this.isLoggedIn,
            date: this.isLoggedIn,
            folder: this.isLoggedIn,
            group: this.isLoggedIn,
            message: this.isLoggedIn,
            messageStatus: this.isLoggedIn,
            // subscription: this.isLoggedIn,
            thread: this.isLoggedIn,
            status: this.isLoggedIn,
            threadStatus: this.isLoggedIn,
            quiz: this.isLoggedIn,
        },
        Mutation: {
            activity: this.isLoggedIn,
            attendance: this.isLoggedIn,
            // channel: this.isLoggedIn,
            cue: this.isLoggedIn,
            date: this.isLoggedIn,
            folder: this.isLoggedIn,
            message: this.isLoggedIn,
            messageStatus: this.isLoggedIn,
            // subscription: this.isLoggedIn,
            thread: this.isLoggedIn,
            status: this.isLoggedIn,
            threadStatus: this.isLoggedIn,
            quiz: this.isLoggedIn,
        },
    };

    /**
     * Initializes GQL elements used later on in queries and mutations
     */
    private initializeGraphQL() {
        // Step 1 - Launch a GQL server instance with fundamental elements required later on by queries and mutations
        this.graphqlServer = new GraphQLServer({
            schema: this.graphqlSchema,
            context: async (req) => {
                // Add the resolve user over here:
                let token = '';

                if (req.request.header('authorization')) {
                    token = req.request.header('authorization') || '';
                }

                let jwtUser: any = null;

                if (token !== '') {
                    jwtUser = resolveUser(token);
                }

                let user = null;

                if (jwtUser && jwtUser.id !== '') {
                    user = user = await UserModel.findById(jwtUser.id);
                }

                // let user = null
                // const userId = req.request.header("userId")
                // if (userId !== '') {
                // 	user = await UserModel.findById(userId)
                // }
                return {
                    mongodb: this.mongoConnection,
                    repositories: new MongoRepositoriesFactory(),
                    user,
                    publisher: this.publisher,
                    oneSignalClient: new OneSignal.Client(
                        '78cd253e-262d-4517-a710-8719abf3ee55',
                        'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
                    ),
                };
            },
            // middlewares: [this.requiresAuthentication],
        });

        // init routes
        initializeRoutes(this.graphqlServer);
        // init form parser
        initializeServerExtensions(this.graphqlServer);

        process.stdout.write(chalk.green('[Bootstraping]') + chalk.whiteBright(' GraphQL Server initialized..... \n'));
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
                uploads: graphqlConfig.uploads,
            });
        } catch (e) {
            throw e;
        }

        // Printing basic endpoint information to the console
        process.stdout.write(chalk.green('[Bootstraping]') + chalk.whiteBright(' GraphQL Server started..... \n'));
        process.stdout.write('\n');
        process.stdout.write(
            chalk.green('[GraphQL]') +
                chalk.whiteBright(' running at port ') +
                chalk.green(String(graphqlConfig.port)) +
                chalk.whiteBright(' , endpoint ') +
                chalk.green(graphqlConfig.endpoint) +
                '   \n'
        );
        process.stdout.write(
            chalk.green('[GraphQL]') +
                chalk.whiteBright(' Subscriptions are at port ') +
                chalk.green(String(graphqlConfig.subscriptions.port)) +
                chalk.whiteBright(' , endpoint ') +
                // chalk.green(graphqlConfig.subscriptions.endpoint) +
                '   \n'
        );
        process.stdout.write(
            chalk.green('[GraphQL]') +
                chalk.whiteBright(' playground is at endpoint ') +
                graphqlConfig.playground +
                '   \n'
        );
        process.stdout.write(
            chalk.green('[GraphQL]') + chalk.whiteBright(' playground is at endpoint ') + ' /voyager \n'
        );
    }
}
