// import busboyBodyParser from 'busboy-body-parser';
// import connectBusboy from 'connect-busboy';
import { GraphQLServer } from 'graphql-yoga';

export function initializeServerExtensions(GQLServer: GraphQLServer) {
  // Connect BusBoy - Form parser
  // GQLServer.use(connectBusboy());
  // GQLServer.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
  // GQLServer.use(bodyParser.json({ limit: '100mb'}));
  // // User BusBoy-BodyParser
  // GQLServer.use(busboyBodyParser());
  const bodyParser = require('body-parser');
  GQLServer.use(bodyParser.urlencoded({ limit: '50mb', extended: 'true' }))
  GQLServer.use(bodyParser.json({ limit: '50mb' }))
}
