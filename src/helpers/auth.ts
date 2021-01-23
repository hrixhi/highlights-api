import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../configs/app';

/**
 * This is the function that creates a token user object that is the authorization stamp for a client
 */
export async function createJWTUser(userDocument: any) {
  const token = jwt.sign(userDocument.toObject(), JWT_SECRET);
  return {
    id: userDocument.id,
    username: userDocument.email,
    name: userDocument.name,
    healthStatus: userDocument.healthStatus,
    logId: userDocument.logId,
    stillOut: userDocument.stillOut,
    lastname: userDocument.lastname,
    age: userDocument.age ? userDocument.age : 0,
    token
  };
}
