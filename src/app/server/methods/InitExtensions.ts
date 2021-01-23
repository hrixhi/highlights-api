import bodyParser = require('body-parser');
import busboyBodyParser from 'busboy-body-parser';
import connectBusboy from 'connect-busboy';
import { GraphQLServer } from 'graphql-yoga';

export function initializeServerExtensions(GQLServer: GraphQLServer) {
  // Connect BusBoy - Form parser
  GQLServer.use(connectBusboy());
  GQLServer.use(bodyParser.urlencoded({ extended: true }));
  GQLServer.use(bodyParser.json());
  // User BusBoy-BodyParser
  GQLServer.use(busboyBodyParser());
}
