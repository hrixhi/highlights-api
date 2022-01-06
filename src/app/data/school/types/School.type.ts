import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { SchoolsModel } from '../mongo/School.model';

@ObjectType()
export class SchoolObject {
    @Field()
    public _id: string;

    @Field()
    public name: string;

    @Field(type => String, { nullable: true })
    public logo?: string;

    @Field(type => String, { nullable: true })
    public streamId?: string;

    @Field(type => Boolean, { nullable: true })
    public allowStudentChannelCreation?: boolean;

    @Field(type => String, { nullable: true })
    public recoveryEmail?: string;

    @Field(type => Boolean, { nullable: true })
    public ssoEnabled?: boolean;

    @Field(type => String, { nullable: true })
    public ssoDomain?: string;

    @Field(type => Boolean, { nullable: true })
    public async workosConnectionActive(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { _id } = localThis._doc || localThis;
        const school: any = await SchoolsModel.findById(_id);
        if (!school || !school._id || !school.workosConnection) {
            return false;
        }

        return true;
    }
}
