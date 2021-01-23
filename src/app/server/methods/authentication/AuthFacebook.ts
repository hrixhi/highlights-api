import { UserRepository } from '@app/data/user/mongo/User.repository';
import { createJWTUser } from '@helper/auth';
import fbgraph from 'fbgraph';
import { GraphQLServer } from 'graphql-yoga';

/**
 * This function adds authentication logic for facebook.
 * Due to lack of updates in passport-facebook-token, this has been done own way.
 *
 * React authenticate facebook -> send access token to this route, and route verify token +
 * generate JWT / create new user.
 *
 */
export const FacebookAuthRoutes = (gqlServer: GraphQLServer) => {
  gqlServer.post("/auth/facebook", async (req: any, res: any) => {
    const { accessToken } = req.body;
    if (
      accessToken === null ||
      accessToken === "" ||
      accessToken === undefined
    ) {
      return res.json({ authFailMessage: "failed" });
    }
    const user = await getUserByAccessToken(accessToken);
    const { email } = user;
    const userRepository = new UserRepository();

    const foundUser: any = await userRepository.findOne({ email });

    // User found ? return JWT token, profile
    if (foundUser !== undefined && foundUser !== null) {
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
        serviceName: "facebook",
        email: user.email,
        name: user.name,
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
 * Used to retrieve name, email and id of facebook user with
 * provided accessToken
 *
 *
 * @param accessToken Facebook AccessToken provided after authentication via Facebook-Login-React
 */
export function getUserByAccessToken(
  accessToken: string
): Promise<{ id: string; email: string; name: string }> {
  return new Promise((resolve, reject) => {
    fbgraph.setAccessToken(accessToken);
    fbgraph.get("me?fields=id,email,name", (error: any, result: any) => {
      if (error) {
        reject(error);
      }
      resolve(result);
    });
  });
}
