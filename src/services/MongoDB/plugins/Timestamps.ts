import { Schema } from 'mongoose';

/**
 * Adding deletedAt field
 * Adding softDelete and unDelete methods into schema
 *
 * @param schema your MongoDB Schema
 * @param options plugin options
 */
export function SoftDeletePlugin(schema: Schema, options: any) {
  schema.add({
    deletedAt: {
      type: Date,
      required: false,
      default: null
    }
  });

  schema.methods.softDelete = () => {
    this.deletedAt = new Date();
    this.save();
  };

  schema.methods.unDelete = () => {
    this.deletedAt = new Date();
    this.save();
  };

  if (options && options.index) {
    schema.path("deletedAt").index(options.index);
  }
}
