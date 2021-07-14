import { SubscriptionModel } from '@app/data/subscription/mongo/Subscription.model';
import { UserModel } from '@app/data/user/mongo/User.model';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ChannelObject {

  @Field()
  public _id: string;

  @Field()
  public name: string;

  @Field({ nullable: true })
  public password: string;

  @Field()
  public createdBy: string;

  @Field(type => String, { nullable: true })
  public async createdByUsername() {
    const localThis: any = this;
    const { createdBy } = localThis._doc || localThis;
    const u: any = await UserModel.findById(createdBy)
    if (u) {
      const user = u.toObject()
      return user.displayName
    } else {
      return '-'
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

  @Field(type => Boolean, { nullable: true })
  public meetingOn?: boolean;

  @Field(type => Boolean, { nullable: true })
  public creatorUnsubscribed?: boolean;

  @Field(type => Boolean, { nullable: true })
  public temporary?: boolean;

}
