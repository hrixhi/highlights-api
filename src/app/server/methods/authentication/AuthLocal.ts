import { verifyPassword } from '@app/data/methods';
import { UserRepository } from '@app/data/user/mongo/User.repository';
import { createJWTUser } from '@helper/auth';
import { GraphQLServer } from 'graphql-yoga';

/**
 * This function adds authentication logic for email+password login
 *
 * React send email and password to this route, and
 * generate JWT if authentication ahs been successfull.
 *
 * @param gqlServer (ExpressJS) GraphQL Yoga instance
 */
export const LocalAuthRoutes = (gqlServer: GraphQLServer): void => {
	gqlServer.post('/auth/login', async (req: any, res: any) => {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.json({ authFailMessage: 'failed' });
		}

		const userRepository = new UserRepository();
		const foundUser: any = await userRepository.findOne({ email, authCode: 0 });

		// User found ? return JWT token, profile
		if (foundUser !== undefined && foundUser !== null) {
			if (await verifyPassword(password, foundUser.password)) {
				userRepository.model.updateOne(
					{ _id: foundUser.id },
					{ updatedAt: new Date(), lastLoginAt: new Date() },
				);
				return res.json(await createJWTUser(foundUser));
			}
		}

		return res.json({
			status: 'error',
			message: 'The authentication failed.',
		});
	});

	gqlServer.get('/auth/logout', (req: any, res: any) => {
		req.logout();
		return res.json({
			message: 'LOGOUT',
			status: 'SUCCESS',
		});
	});
};
