import { SubscriptionModel } from '@app/data/subscription/mongo/Subscription.model';
import { UserModel } from '@app/data/user/mongo/User.model';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { Ctx, Field, ObjectType } from 'type-graphql';
import shortid from 'shortid';
import { ChannelModel } from '../mongo/Channel.model';
import { DateModel } from '@app/data/dates/mongo/dates.model';
import { AcademicTermModel } from '@app/data/academic-term/mongo/academicTerm.model';

@ObjectType()
export class ChannelObject {
    @Field()
    public _id: string;

    @Field()
    public name: string;

    @Field({ nullable: true })
    public password: string;

    @Field((type) => String, { nullable: true })
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

    @Field((type) => String, { nullable: true })
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

    @Field((type) => String, { nullable: true })
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

    @Field((type) => Number, { nullable: true })
    public async numSubs() {
        const localThis: any = this;
        const { _id } = localThis._doc || localThis;

        const channel = await ChannelModel.findOne({
            _id,
        });

        if (!channel) return null;

        let c = channel.toObject();

        let owners = c.owners ? [...c.owners, c.createdBy.toString()] : [c.createdBy.toString()];

        const subs = await SubscriptionModel.find({
            channelId: _id,
            unsubscribedAt: undefined,
        });

        const filterOutOwners = subs.filter((sub: any) => !owners.includes(sub.userId.toString()));
        // Remove channel owner from total sub count
        return filterOutOwners.length;
    }

    @Field((type) => String, { nullable: true })
    public async channelCreator() {
        const localThis: any = this;
        const { createdBy } = localThis._doc || localThis;

        if (createdBy) {
            return createdBy;
        }
    }

    @Field((type) => Boolean, { nullable: true })
    public async meetingOn() {
        const localThis: any = this;
        const { _id } = localThis._doc || localThis;

        const current = new Date();

        const ongoingMeeting = await DateModel.findOne({
            scheduledMeetingForChannelId: _id,
            start: { $lte: current },
            end: { $gte: current },
            isNonMeetingChannelEvent: { $ne: true },
        });

        return ongoingMeeting && ongoingMeeting._id ? true : false;
    }

    @Field((type) => Boolean, { nullable: true })
    public creatorUnsubscribed?: boolean;

    @Field((type) => Boolean, { nullable: true })
    public temporary?: boolean;

    @Field((type) => [String], { nullable: true })
    public owners?: string[];

    @Field((type) => String, { nullable: true })
    public colorCode?: string;

    // @Field(type => String, { nullable: true })
    // public startUrl?: string;

    // @Field(type => String, { nullable: true })
    // public joinUrl?: string;

    // @Field(type => String, { nullable: true })
    // public startedBy?: string;

    @Field((type) => String, { nullable: true })
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

    @Field((type) => Boolean)
    public async isPublic() {
        const localThis: any = this;
        const { isPublic = false } = localThis._doc || localThis;
        return isPublic;
    }

    @Field((type) => String)
    public async accessCode() {
        const localThis: any = this;
        const { _id, accessCode } = localThis._doc || localThis;

        if (!accessCode) {
            // Create an accessCode
            const code = shortid.generate();

            await ChannelModel.updateOne(
                { _id },
                {
                    accessCode: code,
                }
            );

            return code;
        }

        return accessCode;
    }

    @Field((type) => [String])
    public async subscribers() {
        const localThis: any = this;
        const { _id, owners = [], createdBy } = localThis._doc || localThis;

        const subs = await SubscriptionModel.find({
            channelId: _id,
            unsubscribedAt: undefined,
        });

        let userIds = subs.map((sub: any) => sub.userId.toString());

        userIds = userIds.filter((userId: string) => !owners.includes(userId) && createdBy.toString() !== userId);

        console.log('USer Ids', userIds);
        console.log('OWners', owners);
        console.log('Created BY', createdBy);

        return userIds;
    }

    @Field((type) => String, { nullable: true })
    public description?: string;

    @Field((type) => [String], { nullable: true })
    public tags?: string[];

    @Field((type) => String, { nullable: true })
    public sisId?: string;

    @Field((type) => String, { nullable: true })
    public meetingUrl?: string;

    @Field((type) => Date, { nullable: true })
    public deletedAt?: Date;

    @Field((type) => String, { nullable: true })
    public term?: string;

    @Field((type) => String, { nullable: true })
    public async termName() {
        const localThis: any = this;
        const { term } = localThis._doc || localThis;

        if (!term) return null;

        const academicTerm = await AcademicTermModel.findOne({
            _id: term,
        });

        return academicTerm ? academicTerm.name : null;
    }

    @Field((type) => Date, { nullable: true })
    public async start() {
        const localThis: any = this;
        const { term, startDate } = localThis._doc || localThis;

        if (term) {
            const fetchTerm = await AcademicTermModel.findOne({
                _id: term,
            });

            return fetchTerm ? fetchTerm.startDate : null;
        } else if (startDate) {
            return startDate;
        } else {
            return null;
        }
    }

    @Field((type) => Date, { nullable: true })
    public async end() {
        const localThis: any = this;
        const { term, endDate } = localThis._doc || localThis;

        if (term) {
            const fetchTerm = await AcademicTermModel.findOne({
                _id: term,
            });

            return fetchTerm ? fetchTerm.startDate : null;
        } else if (endDate) {
            return endDate;
        } else {
            return null;
        }
    }

    @Field((type) => Date, { nullable: true })
    public startDate?: Date;

    @Field((type) => Date, { nullable: true })
    public endDate?: Date;

    @Field((type) => Number, { nullable: true })
    public creditHours?: number;

    @Field((type) => String, { nullable: true })
    public gradingScale?: string;

    @Field((type) => String, { nullable: true })
    public standardsBasedGradingScale?: string;
}
