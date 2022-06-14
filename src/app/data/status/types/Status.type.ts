import { UserModel } from '@app/data/user/mongo/User.model';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class StatusObject {
    @Field()
    public _id: string;

    @Field()
    public userId: string;

    @Field()
    public cueId: string;

    @Field()
    public status: string;

    @Field()
    public channelId: string;

    @Field((type) => String)
    public async displayName() {
        const localThis: any = this;
        const { userId } = localThis._doc || localThis;
        const user = await UserModel.findById(userId);
        return user ? user.displayName : '';
    }

    @Field((type) => String, { nullable: true })
    public async fullName() {
        const localThis: any = this;
        const { userId } = localThis._doc || localThis;
        const user = await UserModel.findById(userId);
        return user ? user.fullName : '';
    }

    @Field((type) => String, { nullable: true })
    public async email() {
        const localThis: any = this;
        const { userId } = localThis._doc || localThis;
        const user = await UserModel.findById(userId);
        return user ? user.email : '';
    }

    @Field((type) => String, { nullable: true })
    public async avatar() {
        const localThis: any = this;
        const { userId } = localThis._doc || localThis;
        const user = await UserModel.findById(userId);
        if (user) {
            return user.avatar;
        } else {
            return '';
        }
    }

    @Field({ nullable: true })
    public submission: string;

    @Field({ nullable: true })
    public submittedAt: string;

    @Field({ nullable: true })
    public deadline: string;

    @Field({ nullable: true })
    public graded: boolean;

    @Field({ nullable: true })
    public score: number;

    @Field({ nullable: true })
    public comment: string;

    @Field({ nullable: true })
    public releaseSubmission: boolean;

    @Field({ nullable: true })
    public totalPoints: number;

    @Field({ nullable: true })
    public pointsScored: number;
}
