import { BaseRepository } from '@service/MongoDB/modules/Base.repository';
// import { EventModel } from '../../../platform/event/mongo/Event.model';
import { IUserModel, UserModel } from './User.model';
// import { URLModel } from '@app/platform/event/mongo/urls/urls.model';

/**
 * The user repository class, as available in the context
 */
export class UserRepository extends BaseRepository<IUserModel> {

	/**
	 * Constructor initializes itself as a repo belonging to the UserModel
	 */
	constructor() {
		super(UserModel);
	}

}
