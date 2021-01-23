import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { JWT_SECRET } from '@config/app';
import * as jwt from 'jsonwebtoken';
import { AuthChecker } from 'type-graphql';

// create auth checker function
export const authChecker: AuthChecker<IGraphQLContext> = (
  { root, args, context, info },
  roles
) => {
  // WebSocket Fix
  if (!context.request) {
    return true;
  }

  /**
   *  Get JWT token from rew. body
   */
  const jwtToken = context.request.headers.authorization;

  // Decode JWT
  const jwtDecoded = jwt.verify(jwtToken, JWT_SECRET);
  if (!jwtToken) {
    return false;
  }

  // User data from JWT...
  const user: any = jwtDecoded;

  // if `@Authorized()`, check only is user exist
  if (roles.length === 0) {
    return user !== undefined;
  }

  // and if no user, restrict access
  if (!user) {
    return false;
  }

  let hasSomeRequestedRole = false;

  roles.forEach(role => {
    if (user.roles.indexOf(role) > -1) {
      // grant access if the roles overlap
      hasSomeRequestedRole = true;
    }
  });

  return hasSomeRequestedRole;
};
