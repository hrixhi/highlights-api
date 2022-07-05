import { Arg, Field, ObjectType } from 'type-graphql';
import { UserModel } from '../user/mongo/User.model';
import { SchoolsModel } from './mongo/School.model';
import { SchoolObject } from './types/School.type';
import WorkOS from '@workos-inc/node';
import { WORKOS_API_KEY } from '../../../helpers/workosCredentials';
import { DirectoryUserObject } from './types/DirectoryUser.type';

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
            } else {
                return 'PENDING';
            }

            return 'ERROR';
        } catch (e) {
            return 'ERROR';
        }
    }

    @Field((type) => Boolean, {
        description: 'Used to retrieve school by userId',
    })
    public async getStandardsBasedGradingStatus(
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            const fetchSchool = await SchoolsModel.findById(schoolId);

            if (!fetchSchool) return false;

            return fetchSchool.enableStandardsBasedGrading ? fetchSchool.enableStandardsBasedGrading : false;
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }

    @Field((type) => [DirectoryUserObject], {
        description: 'Used to retrieve school by userId',
        nullable: true,
    })
    public async getSchoolDirectory(
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            const fetchStudentsAndInstructors = await UserModel.find({
                schoolId,
                deletedAt: undefined,
            });

            const parentIds = new Set();

            const parentsMap: any = [];

            const directory: any[] = [];

            // Construct Parents

            for (let i = 0; i < fetchStudentsAndInstructors.length; i++) {
                const user = fetchStudentsAndInstructors[i].toObject();

                if (user.role === 'student') {
                    if (user.parent1) {
                        parentIds.add(user.parent1._id.toString());

                        if (parentsMap[user.parent1._id.toString()]) {
                            const updateIds = [...parentsMap[user.parent1._id.toString()]];
                            //
                            updateIds.push({
                                fullName: user.fullName,
                                grade: user.grade,
                                section: user.section,
                            });
                            parentsMap[user.parent1._id.toString()] = updateIds;
                        } else {
                            parentsMap[user.parent1._id.toString()] = [
                                {
                                    fullName: user.fullName,
                                    grade: user.grade,
                                    section: user.section,
                                },
                            ];
                        }
                    }

                    if (user.parent2) {
                        parentIds.add(user.parent2._id.toString());

                        if (parentsMap[user.parent2._id.toString()]) {
                            const updateIds = [...parentsMap[user.parent2._id.toString()]];
                            //
                            updateIds.push({
                                fullName: user.fullName,
                                grade: user.grade,
                                section: user.section,
                            });
                            parentsMap[user.parent2._id.toString()] = updateIds;
                        } else {
                            parentsMap[user.parent2._id.toString()] = [
                                {
                                    fullName: user.fullName,
                                    grade: user.grade,
                                    section: user.section,
                                },
                            ];
                        }
                    }
                }

                directory.push({
                    _id: user._id,
                    fullName: user.fullName,
                    avatar: user.avatar,
                    role: user.role,
                    grade: user.grade,
                    section: user.section,
                    roleDescription:
                        user.role === 'student' ? 'Student, ' + user.grade + '-' + user.section : 'Intructor',
                });
            }

            const fetchParents = await UserModel.find({
                _id: { $in: Array.from(parentIds) },
            });

            for (let i = 0; i < fetchParents.length; i++) {
                const parent = fetchParents[i].toObject();

                const getChildren = parentsMap[parent._id.toString()];

                for (let j = 0; j < getChildren.length; j++) {
                    const child = getChildren[j];

                    directory.push({
                        _id: parent._id,
                        fullName: parent.fullName,
                        avatar: parent.avatar,
                        role: parent.role,
                        grade: parent.grade,
                        section: parent.section,
                        roleDescription: 'Parent of ' + child.fullName + ` (${child.grade}, ${child.section})`,
                    });
                }
            }

            directory.sort((a: any, b: any) => {
                return a.fullName > b.fullName ? 1 : -1;
            });

            return directory;

            // Add Admins last
        } catch (e) {
            console.log('Error', e);
            return [];
        }
    }
}
