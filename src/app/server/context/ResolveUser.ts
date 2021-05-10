import { JWT_SECRET } from '@config/app';
import * as jwt from 'jsonwebtoken';

/**
 * Checks for whether or not a JWT token can be resolved into an actual user object.
 */
export function resolveUser(jwtToken: string) {
  try {
    if (jwtToken.length < 20) {
      return {};
    }
    
    return jwt.verify(jwtToken, JWT_SECRET);
  } catch (error) {
    return null;
  }
}
