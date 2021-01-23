/**
 * Standard imports
 */
import 'reflect-metadata';
import { Server } from '@app/server/server';
import * as dotenv from 'dotenv';

/**
 * Environment path configuration
 */
let path;
switch (process.env.NODE_ENV) {
  case "local":
    path = `${__dirname}/../.env-test`;
    break;
  case "test":
    path = `${__dirname}/../.env-test`;
    break;
  case "production":
    path = `${__dirname}/../.env-production`;
    break;
  default:
    path = `${__dirname}/../.env`;
}
dotenv.config({ path });

/**
 * This is the starting point when it comes to launching the API.
 * Creating an instance of the Server class. 
 * Examine the server.ts file to look deeper into the server setup.
 */
try {
  const server = new Server();
  if (!server) {
    process.exit(0);
  }
} catch (e) {
  throw e;
}
