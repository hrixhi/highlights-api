import { UserModel } from '@app/data/user/mongo/User.model';
import { Arg, Field, ObjectType } from 'type-graphql';
import { hashPassword, verifyPassword } from '../methods';
import { SchoolsModel } from '../school/mongo/School.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { UserObject } from './types/User.type';

/**
 * User Query Endpoints
 */
@ObjectType()
export class UserQueryResolver {

  @Field(type => UserObject, {
    description: "Returns a user by id.",
    nullable: true
  })
  public async findById(
    @Arg("id", type => String)
    id: string
  ) {
    const result: any = await UserModel.findById(id)
    return result;
  }

  @Field(type => [UserObject], {
    description: "Returns list of users by channelId."
  })
  public async findByChannelId(
    @Arg("channelId", type => String)
    channelId: string
  ) {
    try {
      const subscriptions = await SubscriptionModel.find({
        $and: [{ channelId }, { unsubscribedAt: { $exists: false } }]
      })
      const ids: any[] = []
      subscriptions.map((subscriber) => {
        ids.push(subscriber.userId)
      })
      return await UserModel.find({ _id: { $in: ids } })
    } catch (e) {
      console.log(e)
      return []
    }
  }

  @Field(type => UserObject, { nullable: true })
  public async login(
    @Arg('email', type => String)
    email: string,
    @Arg('password', type => String)
    password: string,
  ) {
    try {
      const user: any = await UserModel.findOne({ email })
      if (user) {
        const passwordCorrect = verifyPassword(password, user.password)
        if (passwordCorrect) {
          return user
        }
      }
      return null
    } catch (e) {
      return null
    }
  }

  // @Field(type => Number)
  // public async getSchoolUsers(
  //   @Arg('schoolId', type => String)
  //   schoolId: string,
  // ) {
  //   try {
  //     const users = await UserModel.find({ schoolId })
  //     return users.length;
  //   } catch (e) {
  //     return 0
  //   }
  // }

  @Field(type => [UserObject])
  public async getSchoolUsers(
    @Arg('schoolId', type => String)
    schoolId: string,
  ) {
    try {
      return await UserModel.find({ schoolId })
    } catch (e) {
      return []
    }
  }


  @Field(type => String)
  public async organisationLogin(
    @Arg('name', type => String)
    name: string,
    @Arg('password', type => String)
    password: string
  ) {
    try {
      const unhashedPasswordFound = await SchoolsModel.findOne({ name, password })
      if (unhashedPasswordFound) {
        const hash = await hashPassword(password)
        await SchoolsModel.updateOne({ _id: unhashedPasswordFound._id }, { password: hash })
        return unhashedPasswordFound._id
      } else {
        const school = await SchoolsModel.findOne({ name })
        if (school && verifyPassword(password, school.password)) {
          return school._id
        }
      }
      return 'error'
    } catch (e) {
      return 'error'
    }
  }

}