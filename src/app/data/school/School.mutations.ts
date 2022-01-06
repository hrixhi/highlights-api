import { Arg, Field, ObjectType } from 'type-graphql';
import { hashPassword, verifyPassword } from '../methods';
import { SchoolsModel } from './mongo/School.model';
import WorkOS from '@workos-inc/node';
import { EmailService } from '../../../emailservice/Postmark';
import { WORKOS_API_KEY } from '../../../helpers/workosCredentials';

/**
 * School Mutation Endpoints
 */
@ObjectType()
export class SchoolMutationResolver {
    // Create School
    @Field(type => Boolean, {
        description: ''
    })
    public async create(
        @Arg('name', type => String)
        name: string,
        @Arg('password', type => String)
        password: string,
        @Arg('ssoEnabled', type => Boolean)
        ssoEnabled: boolean,
        @Arg('ssoDomain', type => String, { nullable: true })
        ssoDomain?: string
    ) {
        try {
            const hash = await hashPassword(password);

            const encodeOrgName = name
                .split(' ')
                .join('_')
                .toLowerCase();

            const org = await SchoolsModel.create({
                name,
                password: hash,
                cuesDomain: encodeOrgName + '.learnwithcues.com'
            });

            if (!org) {
                return false;
            }

            if (ssoEnabled && ssoDomain && ssoDomain !== '') {
                const workos = new WorkOS(WORKOS_API_KEY);

                const organization = await workos.organizations.createOrganization({
                    name,
                    domains: [ssoDomain]
                });

                console.log('Created WorkOS Organization', organization);

                if (organization && organization.id) {
                    const updateMongo = await SchoolsModel.updateOne(
                        {
                            _id: org._id
                        },
                        {
                            workosOrgId: organization.id,
                            ssoDomain
                        }
                    );

                    console.log('updateMongo', updateMongo);
                }
            }

            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field(type => Boolean, {
        description: 'Used to update school admin details.'
    })
    public async update(
        @Arg('schoolId', type => String)
        schoolId: string,
        @Arg('recoveryEmail', type => String)
        recoveryEmail: string,
        @Arg('allowStudentChannelCreation', type => Boolean)
        allowStudentChannelCreation: boolean,
        @Arg('logo', type => String, { nullable: true })
        logo?: string,
        @Arg('streamId', type => String, { nullable: true })
        streamId?: string
    ) {
        try {
            await SchoolsModel.updateOne(
                { _id: schoolId },
                {
                    recoveryEmail,
                    allowStudentChannelCreation,
                    logo: logo && logo !== '' ? logo : undefined,
                    streamId: streamId === '' ? undefined : streamId
                }
            );

            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field(type => Boolean, {
        description: 'Used to update school admin password.'
    })
    public async updateAdminPassword(
        @Arg('schoolId', type => String)
        schoolId: string,
        @Arg('currentPassword', type => String)
        currentPassword: string,
        @Arg('newPassword', type => String)
        newPassword: string
    ) {
        try {
            const s = await SchoolsModel.findById(schoolId);
            if (s) {
                const school: any = s.toObject();
                const passwordCorrect = await verifyPassword(currentPassword, school.password);
                if (passwordCorrect) {
                    const hash = await hashPassword(newPassword);
                    await SchoolsModel.updateOne({ _id: schoolId }, { password: hash });
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field(type => Boolean, {
        description: 'Used to update school admin password.'
    })
    public async newSSORequest(
        @Arg('schoolId', type => String)
        schoolId: string,
        @Arg('ssoDomain', type => String)
        ssoDomain: string
    ) {
        try {
            const s = await SchoolsModel.findById(schoolId);
            if (s) {
                const school: any = s.toObject();

                const emailService = new EmailService();
                emailService.ssoRequest(school.name, ssoDomain, school.cuesDomain);

                return true;
            } else {
                return false;
            }
        } catch (e) {
            console.log(e);
            return false;
        }
    }
}
