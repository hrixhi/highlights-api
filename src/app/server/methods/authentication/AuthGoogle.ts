import { UserRepository } from '@app/data/user/mongo/User.repository';
import { createJWTUser } from '@helper/auth';
import { OAuth2Client } from 'google-auth-library';
import { GraphQLServer } from 'graphql-yoga';

/**
 * This function adds authentication logic for Google.
 * This authentication flow follows the same lead as Facebook auth strategy.
 *
 * React authenticate google -> send access token to this route,
 * and route verify token (retrieve user) +
 * generate JWT / create new user.
 *
 */
export const GoogleAuthRoutes = (gqlServer: GraphQLServer): void => {
  gqlServer.post("/auth/google", async (req: any, res: any) => {
    const { accessToken } = req.body;
    const user = await getUserByAccessToken(accessToken);
    if (!user.emailVerified) {
      return res.json({
        status: "error",
        message: "You need to use verified e-mail."
      });
    }
    const { email } = user;
    const userRepository = new UserRepository();
    // This is fuxture for subdomains with GSuite - happened with something.brown.edu
    const rootEmail = email.split("@");
    const searchedEmails = [email];
    const splittedEmail = rootEmail[1].split(".");
    if (splittedEmail.length > 2) {
      searchedEmails.push(
        rootEmail[0] + "@" + splittedEmail[1] + "." + splittedEmail[2]
      );
    }
    // End of fixture @todo finish
    const foundUser: any = await userRepository.findOne({
      email
    });

    if (foundUser !== {}) {
      userRepository.model.updateOne(
        { _id: foundUser.id },
        { updatedAt: new Date(), lastLoginAt: new Date() }
      );
      return res.json(await createJWTUser(foundUser));
    } else {
      return res.json({
        status: "error",
        message: "The authentication failed."
      });
    }

    // For now, the new User creation has been blocked
    const newUser = await userRepository.create({
      name: user.name,
      lastname: "",
      email: user.email,
      services: {
        serviceName: "google",
        serviceUserId: user.serviceUserId,
        email: user.email,
        name: user.name,
        lastname: user.lastname,
        accessToken
      },
      updatedAt: new Date()
    });
    if (newUser) {
      return res.json(await createJWTUser(newUser));
    }
    return res.json({ status: "error", message: "The authentication failed." });
    // End of code that is not going be run
  });
};

/**
 * Used to retrieve name, email and id of google user with
 * provided accessToken
 *
 *
 * @param accessToken Google AccessToken provided after authentication via Google-Login-React
 */
export async function getUserByAccessToken(
  accessToken: string
): Promise<{
  serviceUserId: string;
  profile: string;
  fullname: string;
  name: string;
  lastname: string;
  email: string;
  emailVerified: boolean;
}> {
  const oAuth2Client = new OAuth2Client({
    clientId:
      "518192388634-kak968s7qbfqnlhip3mdo40s85cae7ip.apps.googleusercontent.com",
    redirectUri: "http://localhost:3000"
  });
  await oAuth2Client.setCredentials({
    access_token: accessToken
  });

  return new Promise((resolve, reject) => {
    oAuth2Client
      .request({
        url: "https://www.googleapis.com/oauth2/v3/userinfo"
      })
      .catch(e => {
        reject(e);
      })
      .then(res => {
        const { data }: any = res;
        return resolve({
          serviceUserId: data.sub,
          profile: data.profile,
          fullname: data.name,
          name: data.given_name,
          lastname: data.family_name,
          email: data.email,
          emailVerified: data.email_verified
        });
      });
  });
}
