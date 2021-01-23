import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { CueObject } from './types/Cue.type';
import { CueModel } from './mongo/Cue.model';
import { UserModel } from '../user/mongo/User.model'

/**
 * Log Query Endpoints
 */
@ObjectType()
export class CueQueryResolver {

  @Field(type => CueObject, {
    description: "Used to find one user by id."
  })
  public async findById(
    @Arg("id", type => String)
    id: string
  ) {
    const result: any = await CueModel.findById(id);
    return result;
  }

}