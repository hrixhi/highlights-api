import { Document, Model, Types } from 'mongoose';

/**
 *  Base repository for MongoDB related operations
 */
export class BaseRepository<T extends Document> {
	/**
	 * Your MongoDB Model
	 */
	public model: Model<Document>;

	constructor(schemaModel: Model<Document>) {
		this.model = schemaModel;
	}

	/**
	 * Used when you want to insert document into MongoDB
	 *
	 * @param item Document you want to insert
	 */
	public async create(item: object) {
		let find;
		try {
			find = await this.model.create(item);
		} catch (e) {
			throw e;
		}
		return find;
	}

	/**
	 * Used when you want to update document by _id
	 *
	 * @param id ObjectID of document
	 * @param item Your update object
	 */
	public async update(id: string, item: any) {
		// console.log(item);
		return await this.model.update({ _id: this.toObjectId(id) }, item);
	}

	/**
	 * Used when you want to delete document by _id
	 *
	 * @param id ObjectID of document
	 */
	public async delete(id: string) {
		return await this.model.updateOne(
			{ _id: this.toObjectId(id) },
			{ deletedAt: new Date() },
		);
	}

	/**
	 *
	 *
	 * @param id ObjectID of document
	 */
	public async findById(id: string) {
		if (id === null) return;
		return await this.model.findOne({
			$or: [{ _id: this.toObjectId(id) }, { oldId: id }],
			deletedAt: { $exists: false },
		});
	}

	/**
	 * Used for creating HexString of ObjectID from String
	 *
	 * @param id String representing ObjectID
	 */
	public toObjectId(id: string): Types.ObjectId | string {
		if (typeof id === "object") return id;
		return Types.ObjectId.createFromHexString(id);
	}

	/**
	 * MongooseModel -> .find()
	 *
	 * @param query Object - match query
	 */
	public async find(query: object) {
		return await this.model.find({ deletedAt: { $exists: false }, ...query });
	}

	public async findLean(query: object) {
		return await this.model.find({ deletedAt: { $exists: false }, ...query }).lean();
	}

	/**
	 * MongooseModel -> .findOne()
	 *
	 * @param query Object - match query
	 */
	public async findOne(query: object) {
		return await this.model.findOne({
			deletedAt: { $exists: false },
			...query,
		});
	}
}
