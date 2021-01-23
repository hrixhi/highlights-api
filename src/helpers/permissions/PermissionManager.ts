// import { UserRepository } from '@app/account/user/mongo/User.repository';
// // import { EventRepository } from '@app/platform/event/mongo/Event.repository';
// import Roles from '@istkt/lib/enums/Roles.enum';

// export class PermissionManager {

// 	private async isAdmin(userId: string) {
// 		const userRepo = new UserRepository();
// 		const user: any = await userRepo.findById(userId);
// 		if (user) {
// 			return user.roles.indexOf(Roles.ADMIN) > -1;
// 		}
// 		return false;
// 	}

// 	/
// }
