import { MongoConnectionURI } from '@config/mongodb';
import { connect, Mongoose, plugin } from 'mongoose';
import { SoftDeletePlugin } from './plugins/Timestamps';

/**
 * This class helps establish a connection to the Database.
 */
export class MongoDBService {
	public static async connect(
		uri?: string,
		pass?: string,
		dbname?: string,
	): Promise<Mongoose> {
		plugin(SoftDeletePlugin);
		const MONGODB_URI = MongoConnectionURI;
		const uris = uri ? uri : MONGODB_URI;
		return connect(
			uris,
			{
				useNewUrlParser: true,
				useUnifiedTopology: true
			},
		);
	}
}
