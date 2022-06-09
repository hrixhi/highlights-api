import { Arg, Field, ObjectType } from 'type-graphql';
import { UserModel } from '../user/mongo/User.model';
import { SchoolsModel } from './mongo/School.model';
import { SchoolObject } from './types/School.type';
import WorkOS from '@workos-inc/node';
import { WORKOS_API_KEY } from '../../../helpers/workosCredentials';

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')(
    'sk_test_51L82d3KAaVnDM2WugfJGaRCApwuFdyaUdDkGroOaUZfYWyJ6Tn0VmEBtLJDrl4BElVFAIASEQ4WKRzwx0hmbQdqb001ZYOCYsu'
);

enum GeneratePortalLinkIntent {
    SSO = 'sso',
    DSync = 'dsync',
}

/**
 * School Query Endpoints
 */
@ObjectType()
export class SchoolQueryResolver {
    @Field((type) => SchoolObject, {
        description: 'Used to retrieve school',
        nullable: true,
    })
    public async findById(
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            return await SchoolsModel.findById(schoolId);
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    @Field((type) => SchoolObject, {
        description: 'Used to retrieve school by userId',
        nullable: true,
    })
    public async findByUserId(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            const u = await UserModel.findById(userId);
            if (u) {
                const user = u.toObject();
                if (user.schoolId) {
                    return await SchoolsModel.findById(user.schoolId);
                }
            }
            return null;
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    @Field((type) => SchoolObject, {
        description: 'Used to retrieve org by schoolId',
        nullable: true,
    })
    public async getOrgInfo(
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            return await SchoolsModel.findById(schoolId);
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    @Field((type) => String, {
        description: 'Used to retrieve school by userId',
        nullable: true,
    })
    public async getSsoSetupLink(
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            const u = await SchoolsModel.findById(schoolId);

            if (u) {
                const school = u.toObject();

                const workosOrgId = school.workosOrgId;
                const adminPortalDomain = school.cuesDomain;

                if (workosOrgId && adminPortalDomain) {
                    const workos = new WorkOS(WORKOS_API_KEY);

                    const { link } = await workos.portal.generateLink({
                        organization: workosOrgId,
                        intent: GeneratePortalLinkIntent.SSO,
                        returnUrl: adminPortalDomain,
                        // returnUrl: 'localhost:3000'
                    });

                    return link;
                }
            }
            return null;
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    @Field((type) => String, {
        description: 'Used to retrieve school by userId',
        nullable: true,
    })
    public async getStripeConnectStatus(
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            // RETURN PENDING, DETAILS_SUBMITTED, ACTIVE

            const fetchSchool = await SchoolsModel.findById(schoolId);

            if (!fetchSchool) return 'INVALID_SCHOOL_ID';

            if (!fetchSchool.stripeAccountId) {
                return 'PENDING';
            }

            const account = await stripe.accounts.retrieve(fetchSchool.stripeAccountId);

            console.log('Account', account);

            if (!account) {
                return 'PENDING';
            }

            if (account.details_submitted && account.charges_enabled) {
                return 'ACTIVE';
            } else if (account.details_submitted) {
                return 'IN_PROGRESS';
            }

            return 'ERROR';
        } catch (e) {
            return 'ERROR';
        }
    }
}
