import { Arg, Field, ObjectType } from 'type-graphql';
import { UserModel } from '../user/mongo/User.model';
import { SchoolsModel } from './mongo/School.model';
import { SchoolObject } from './types/School.type';
import WorkOS from '@workos-inc/node';
import { WORKOS_API_KEY } from '../../../helpers/workosCredentials';

enum GeneratePortalLinkIntent {
    SSO = 'sso',
    DSync = 'dsync'
}

/**
 * School Query Endpoints
 */
@ObjectType()
export class SchoolQueryResolver {
    @Field(type => SchoolObject, {
        description: 'Used to retrieve school',
        nullable: true
    })
    public async findById(
        @Arg('schoolId', type => String)
        schoolId: string
    ) {
        try {
            return await SchoolsModel.findById(schoolId);
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    @Field(type => SchoolObject, {
        description: 'Used to retrieve school by userId',
        nullable: true
    })
    public async findByUserId(
        @Arg('userId', type => String)
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

    @Field(type => String, {
        description: 'Used to retrieve school by userId',
        nullable: true
    })
    public async getSsoSetupLink(
        @Arg('schoolId', type => String)
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
                        returnUrl: adminPortalDomain
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
}
