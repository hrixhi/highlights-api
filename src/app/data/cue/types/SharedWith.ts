import { UserModel } from '@app/data/user/mongo/User.model';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class SharedWithObject {

  @Field(type => String)
  public async label() {
    const localThis: any = this;
    const { value } = localThis._doc || localThis;
    if (value) {
      const u = await UserModel.findById(value)
      if (u) {
        const user = u.toObject()
        return user.fullName
      } else {
        return '-'
      }
    } else {
      return '-'
    }
  }

  @Field()
  public value: string;

  @Field()
  public isFixed: boolean;

}
