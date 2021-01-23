import { IUserModel, UserModel } from '@app/data/user/mongo/User.model';
import { GraphQLServer } from 'graphql-yoga';
import passport from 'passport';
import { FacebookAuthRoutes } from './authentication/AuthFacebook';
import { GoogleAuthRoutes } from './authentication/AuthGoogle';
import { LocalAuthRoutes } from './authentication/AuthLocal';

/**
 * Function that initializes all the authentication routes required by the server.
 * Keep in mind, these are established as non-GQL routes.
 */
export function initializeAuthentication(GQLServer: GraphQLServer): void {

  // Serializing user
  passport.serializeUser((user: IUserModel, done) => {
    done(null, user.id);
  });

  // How are we gonna retrieve user ?
  passport.deserializeUser((id, done) => {
    UserModel.findById(id, (err, user: IUserModel) => {
      done(err, user);
    });
  });

  // Isotope Login
  LocalAuthRoutes(GQLServer);
  // Facebook Login
  FacebookAuthRoutes(GQLServer);
  // Google Login
  GoogleAuthRoutes(GQLServer);

  // Initialise passport auth session
  GQLServer.use(passport.initialize());
  GQLServer.use(passport.session());
}
