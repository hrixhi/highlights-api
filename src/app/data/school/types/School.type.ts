import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { SchoolsModel } from '../mongo/School.model';
// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')(
    'sk_test_51L82d3KAaVnDM2WugfJGaRCApwuFdyaUdDkGroOaUZfYWyJ6Tn0VmEBtLJDrl4BElVFAIASEQ4WKRzwx0hmbQdqb001ZYOCYsu'
);

@ObjectType()
export class SchoolObject {
    @Field()
    public _id: string;

    @Field()
    public name: string;

    @Field((type) => String, { nullable: true })
    public email?: string;

    @Field((type) => String, { nullable: true })
    public phoneNumber?: string;

    @Field((type) => String, { nullable: true })
    public website?: string;

    @Field((type) => String, { nullable: true })
    public logo?: string;

    @Field((type) => String, { nullable: true })
    public streamId?: string;

    @Field((type) => Boolean, { nullable: true })
    public allowStudentChannelCreation?: boolean;

    @Field((type) => String, { nullable: true })
    public recoveryEmail?: string;

    @Field((type) => Boolean, { nullable: true })
    public ssoEnabled?: boolean;

    @Field((type) => String, { nullable: true })
    public ssoDomain?: string;

    @Field((type) => Boolean, { nullable: true })
    public async workosConnectionActive(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { _id } = localThis._doc || localThis;
        const school: any = await SchoolsModel.findById(_id);
        if (!school || !school._id || !school.workosConnection) {
            return false;
        }

        return true;
    }

    @Field((type) => String, { nullable: true })
    public async currency(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { _id, stripeAccountId } = localThis._doc || localThis;

        let currency = 'usd';
        // IF STRIPE ACCOUNT ID, THEN WE RETURN CURRENCY, ELSE DEFAULT CURRENCY OF DOLLAR

        const account = await stripe.accounts.retrieve(stripeAccountId);

        if (!account) return currency;

        const countrySpec = await stripe.countrySpecs.retrieve(account.country);

        if (!countrySpec) return currency;

        currency = countrySpec.default_currency;

        return currency;
    }

    @Field((type) => String, { nullable: true })
    public meetingProvider?: string;
}
