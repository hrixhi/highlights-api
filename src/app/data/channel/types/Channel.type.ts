import { SubscriptionModel } from '@app/data/subscription/mongo/Subscription.model';
import { UserModel } from '@app/data/user/mongo/User.model';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { Ctx, Field, ObjectType } from 'type-graphql';
import shortid from 'shortid';
import { ChannelModel } from '../mongo/Channel.model';

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
                return item === context.user!._id;
            });
            if (anotherOwner) {
                return anotherOwner;
            }
        }
        return createdBy;
    }

    @Field(type => String, { nullable: true })
    public async createdByUsername(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { createdBy, owners } = localThis._doc || localThis;
        const u: any = await UserModel.findById(createdBy);
        if (owners && context.user) {
            const anotherOwner = owners.find((item: any) => {
                return item === context.user!._id;
            });
            if (anotherOwner) {
                const u2: any = await UserModel.findById(anotherOwner);
                if (u2) {
                    const user = u2.toObject();
                    return user.fullName;
                } else {
                    return '';
                }
            }
        }

        if (u) {
            const user = u.toObject();
            return user.fullName;
        } else {
            return '';
        }
    }

    @Field(type => String, { nullable: true })
    public async role() {
        const localThis: any = this;
        const { createdBy } = localThis._doc || localThis;
        const u: any = await UserModel.findById(createdBy);
        if (u) {
            const user = u.toObject();
            return user.role ? user.role : '-';
        } else {
            return '-';
        }
    }

    @Field(type => Number, { nullable: true })
    public async numSubs() {
        const localThis: any = this;
        const { _id } = localThis._doc || localThis;
        const subs = await SubscriptionModel.find({
            channelId: _id,
            unsubscribedAt: { $exists: false }
        });
        // Remove channel owner from total sub count
        return subs.length - 1;
    }

    @Field(type => String, { nullable: true })
    public async channelCreator() {
        const localThis: any = this;
        const { createdBy } = localThis._doc || localThis;

        if (createdBy) {
            return createdBy;
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

    // @Field(type => String, { nullable: true })
    // public startUrl?: string;

    // @Field(type => String, { nullable: true })
    // public joinUrl?: string;

    // @Field(type => String, { nullable: true })
    // public startedBy?: string;

    @Field(type => String, { nullable: true })
    public async createdByAvatar() {
        const localThis: any = this;
        const { createdBy } = localThis._doc || localThis;
        const user = await UserModel.findById(createdBy);
        if (user) {
            return user.avatar;
        } else {
            return '';
        }
    }

    @Field(type => Boolean)
    public async isPublic() {
        const localThis: any = this;
        const { isPublic = false } = localThis._doc || localThis;
        return isPublic;
    }

    @Field(type => String)
    public async accessCode() {
        const localThis: any = this;
        const { _id, accessCode } = localThis._doc || localThis;

        if (!accessCode) {
            // Create an accessCode
            const code = shortid.generate();

            await ChannelModel.updateOne(
                { _id },
                {
                    accessCode: code
                }
            );

            return code;
        }

        return accessCode;
    }

    @Field(type => String, { nullable: true })
    public description?: string;

    @Field(type => [String], { nullable: true })
    public tags?: string[];
}
