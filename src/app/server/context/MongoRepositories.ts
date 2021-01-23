import { UserRepository } from '../../data/user/mongo/User.repository';
/**
 * This is the class that is launched into the GQL context
 */
export class MongoRepositoriesFactory {
  // User repository
  public User = new UserRepository();
}
