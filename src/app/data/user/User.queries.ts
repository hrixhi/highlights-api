import { UserModel } from '@app/data/user/mongo/User.model';
import { Arg, Field, ObjectType } from 'type-graphql';
import { UserObject } from './types/User.type';

/**
 * User Query Endpoints
 */
@ObjectType()
export class UserQueryResolver {

  @Field(type => UserObject, {
    description: "Used to find one user by id."
  })
  public async findById(
    @Arg("id", type => String)
    id: string
  ) {
    const result: any = await UserModel.findById(id)
    return result;
  }

}