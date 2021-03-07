import busboyBodyParser from 'busboy-body-parser';
import connectBusboy from 'connect-busboy';
import { GraphQLServer } from 'graphql-yoga';

export function initializeServerExtensions(GQLServer: GraphQLServer) {
  GQLServer.use(connectBusboy());
  GQLServer.use(busboyBodyParser());
  const bodyParser = require('body-parser');
  GQLServer.use(bodyParser.urlencoded({ limit: '50mb', extended: 'true' }))
  GQLServer.use(bodyParser.json({ limit: '50mb' }))
}
