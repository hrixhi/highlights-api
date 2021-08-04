import { SubscriptionModel } from '@app/data/subscription/mongo/Subscription.model';
import { UserModel } from '@app/data/user/mongo/User.model';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { Ctx, Field, ObjectType } from 'type-graphql';
@ObjectType()
export class ChannelObject {

  @Field()
  public _id: string;

  @Field()
  public name: string;

  @Field({ nullable: true })
  public password: string;

  @Field(type => String, { nullable: true })
  public async createdBy(@Ctx() context: IGraphQLContext) {
    const localThis: any = this;
    const { createdBy, owners } = localThis._doc || localThis;
    if (owners && context.user) {
      const anotherOwner = owners.find((item: any) => {
        return item === context.user!._id
      })
      if (anotherOwner) {
        return anotherOwner
      }
    }
    return createdBy
  }

  @Field(type => String, { nullable: true })
  public async createdByUsername(@Ctx() context: IGraphQLContext) {
    const localThis: any = this;
    const { createdBy, owners } = localThis._doc || localThis;
    const u: any = await UserModel.findById(createdBy)
    if (owners && context.user) {
      const anotherOwner = owners.find((item: any) => {
        return item === context.user!._id
      })
      if (anotherOwner) {
        const u2: any = await UserModel.findById(anotherOwner)
        if (u2) {
          const user = u2.toObject()
          return user.displayName
        } else {
          return ''
        }
      }
    }

    if (u) {
      const user = u.toObject()
      return user.displayName
    } else {
      return ''
    }

  }

  @Field(type => String, { nullable: true })
  public async role() {
    const localThis: any = this;
    const { createdBy } = localThis._doc || localThis;
    const u: any = await UserModel.findById(createdBy)
    if (u) {
      const user = u.toObject()
      return user.role ? user.role : '-'
    } else {
      return '-'
    }
  }

  @Field(type => Number, { nullable: true })
  public async numSubs() {
    const localThis: any = this;
    const { _id } = localThis._doc || localThis;
    const subs = await SubscriptionModel.find({
      channelId: _id,
      unsubscribedAt: { $exists: false }
    })
    return subs.length
  }

  @Field(type => String, { nullable: true })
  public async channelCreator() {
    const localThis: any = this;
    const { createdBy } = localThis._doc || localThis;

    if (createdBy) {
      return createdBy
    }
  }

  @Field(type => Boolean, { nullable: true })
  public meetingOn?: boolean;

  @Field(type => Boolean, { nullable: true })
  public creatorUnsubscribed?: boolean;

  @Field(type => Boolean, { nullable: true })
  public temporary?: boolean;

  @Field(type => [String], { nullable: true })
  public owners?: string[];

  @Field(type => String, { nullable: true }) 
  public colorCode?: string;

}
