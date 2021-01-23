import { JWT_SECRET } from '@config/app';
import * as jwt from 'jsonwebtoken';

/**
 * Checks for whether or not a JWT token can be resolved into an actual user object.
 */
export function resolveUser(req: { jwtToken: string }) {
  try {
    if (req.jwtToken.length < 20) {
      return {};
    }
    return jwt.verify(req.jwtToken, JWT_SECRET);
  } catch (error) {
    return error;
  }
}
