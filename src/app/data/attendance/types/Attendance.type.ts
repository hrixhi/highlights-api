import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { DateModel } from '@app/data/dates/mongo/dates.model';
import { UserModel } from '@app/data/user/mongo/User.model';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class DateObject {
    @Field()
    public start: Date;

    @Field()
    public end: Date;
}

@ObjectType()
export class AttendanceObject {
    @Field(type => Date, { nullable: true })
    public joinedAt: Date;

    @Field(type => Date, { nullable: true })
    public leftAt: Date;

    @Field(type => String)
    public async displayName() {
        const localThis: any = this;
        const { userId } = localThis._doc || localThis;
        const user = await UserModel.findById(userId);
        return user ? user.displayName : '';
    }

    @Field(type => String, { nullable: true })
    public channelId: String;

    @Field(type => DateObject)
    public async date() {
        const localThis: any = this;
        const { dateId } = localThis._doc || localThis;
        return await DateModel.findById(dateId);
    }
}
