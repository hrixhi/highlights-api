import { Arg, Field, ObjectType } from 'type-graphql';
import { hashPassword, verifyPassword } from '../methods';
import { SchoolsModel } from './mongo/School.model';
import WorkOS from '@workos-inc/node';
import { EmailService } from '../../../emailservice/Postmark';
import { WORKOS_API_KEY } from '../../../helpers/workosCredentials';
import { CourseCreateAdmin } from './input-types/CourseCreateAdmin.input';
import { AddCoursesResponseObject } from './types/AddCoursesResponse.type';
import { UserModel } from '../user/mongo/User.model';
import { ChannelModel } from '../channel/mongo/Channel.model';
import shortid from 'shortid';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { AddEnrollmentAdmin } from './input-types/AddEnrollmentAdmin.input';
import { CueModel } from '../cue/mongo/Cue.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { ThreadStatusModel } from '../thread-status/mongo/thread-status.model';
import { ThreadModel } from '../thread/mongo/Thread.model';
import { AddEnrollmentsResponseObject } from './types/AddEnrollmentsResponse.type';

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

    @Field(type => AddCoursesResponseObject, {
        description: 'Used to add courses to a school.'
    })
    public async addCoursesToOrganisation(
        @Arg('courses', type => [CourseCreateAdmin])
        courses: CourseCreateAdmin[],
        @Arg('schoolId', type => String)
        schoolId: string
    ) {
        try {
            const fetchSchool = await SchoolsModel.findOne({
                _id: schoolId
            });

            if (!fetchSchool) {
                return {
                    successful: [],
                    failed: [],
                    error: 'No org found with this School Id'
                };
            }

            const addSuccess: any[] = [];
            const failed: any[] = [];

            for (const course of courses) {
                let fetchOwner: any = {};

                if (course.courseOwnerEmail) {
                    fetchOwner = await UserModel.findOne({
                        email: course.courseOwnerEmail
                    });
                } else if (course.courseOwnerSisId) {
                    fetchOwner = await UserModel.findOne({
                        sisId: course.courseOwnerSisId
                    });
                }

                console.log('Owner', fetchOwner);

                // Check if owner exists first

                if (!fetchOwner || !fetchOwner._id) {
                    failed.push(course.name);
                    continue;
                }

                const THEME_CHOICES = [
                    '#f44336',
                    '#e91e63',
                    '#9c27b0',
                    '#673ab7',
                    '#3f51b5',
                    '#2196f3',
                    '#03a9f4',
                    '#00bcd4',
                    '#009688',
                    '#4caf50',
                    '#8bc34a',
                    '#cddc39',
                    '#0d5d35',
                    '#ffc107',
                    '#ff9800',
                    '#ff5722',
                    '#795548',
                    '#607db8'
                ];

                const randomColorCode = THEME_CHOICES[Math.floor(Math.random() * THEME_CHOICES.length)];

                // Create the channel
                const createChannel = await ChannelModel.create({
                    name: course.name,
                    sisId: course.sisId ? course.sisId : undefined,
                    password: course.password ? course.password : undefined,
                    temporary: false,
                    colorCode: randomColorCode,
                    accessCode: shortid.generate(),
                    createdBy: fetchOwner._id.toString(),
                    owners: [],
                    schoolId: fetchOwner.schoolId ? fetchOwner.schoolId : ''
                });

                console.log('Create a channel', createChannel);

                if (createChannel && createChannel._id) {
                    // Subscribe Owner
                    const subscription = await SubscriptionModel.create({
                        userId: fetchOwner._id,
                        channelId: createChannel._id
                    });

                    console.log('Subscription', subscription);

                    addSuccess.push(course.name);
                } else {
                    failed.push(course.name);
                }
            }

            return {
                successful: addSuccess,
                failed,
                error: ''
            };
        } catch (e) {
            console.log(e);
            return {
                successful: [],
                failed: [],
                error: 'Something went wrong. Try again.'
            };
        }
    }

    @Field(type => AddEnrollmentsResponseObject, {
        description: 'Used to add courses to a school.'
    })
    public async addEnrollmentsToOrganisation(
        @Arg('enrollments', type => [AddEnrollmentAdmin])
        enrollments: AddEnrollmentAdmin[],
        @Arg('schoolId', type => String)
        schoolId: string
    ) {
        try {
            const fetchSchool = await SchoolsModel.findOne({
                _id: schoolId
            });

            if (!fetchSchool) {
                return {
                    successful: [],
                    failed: [],
                    error: 'No org found with this School Id'
                };
            }

            const addSuccess: any[] = [];
            const failed: any[] = [];

            for (const enrollment of enrollments) {
                const courseSisId = enrollment.courseSisId ? enrollment.courseSisId : '';
                const courseAccessCode = enrollment.courseAccessCode ? enrollment.courseAccessCode : '';

                const userSisId = enrollment.userSisId ? enrollment.userSisId : '';
                const userEmail = enrollment.userEmail ? enrollment.userEmail : '';

                const enrollmentType = enrollment.enrollmentType;

                let findCourse: any = {};

                if (courseSisId !== '') {
                    findCourse = await ChannelModel.findOne({
                        sisId: courseSisId,
                        schoolId
                    });
                } else if (courseAccessCode !== '') {
                    findCourse = await ChannelModel.findOne({
                        accessCode: courseAccessCode,
                        schoolId
                    });
                }

                console.log('Found course', findCourse);

                if (!findCourse) {
                    failed.push({
                        index: enrollment.index,
                        errorType: 'INVALID_COURSE'
                    });
                    continue;
                }

                let findUser: any = {};

                if (userSisId !== '') {
                    findUser = await UserModel.findOne({
                        sisId: userSisId
                    });
                } else if (userEmail !== '') {
                    findUser = await UserModel.findOne({
                        email: userEmail
                    });
                }

                if (!findUser) {
                    failed.push({
                        index: enrollment.index,
                        errorType: 'INVALID_USER'
                    });
                    continue;
                }

                const userId = findUser._id;
                const channelId = findCourse._id;

                // CHECK FOR EXISTING SUB

                const sub = await SubscriptionModel.findOne({
                    userId,
                    channel: findCourse._id,
                    unsubscribedAt: { $exists: false }
                });

                if (sub) {
                    continue;
                }

                // CREATE SUBSCRIPTION
                const pastSubs = await SubscriptionModel.find({
                    userId,
                    channelId
                });
                if (pastSubs.length === 0) {
                    const channelCues = await CueModel.find({ channelId, limitedShares: { $ne: true } });
                    channelCues.map(async (cue: any) => {
                        const cueObject = cue.toObject();
                        const duplicate = { ...cueObject };
                        delete duplicate._id;
                        delete duplicate.deletedAt;
                        delete duplicate.__v;
                        duplicate.cueId = cue._id;
                        duplicate.cue = '';
                        duplicate.userId = userId;
                        duplicate.score = 0;
                        duplicate.graded = false;
                        const u = await ModificationsModel.create(duplicate);
                    });
                }

                const threads = await ThreadModel.find({
                    channelId,
                    isPrivate: false
                });
                threads.map(async t => {
                    const thread = t.toObject();
                    await ThreadStatusModel.create({
                        userId,
                        channelId,
                        cueId: thread.cueId ? thread.cueId : null,
                        threadId: thread.parentId ? thread.parentId : thread._id
                    });
                });

                await SubscriptionModel.updateMany(
                    {
                        userId,
                        channelId,
                        unsubscribedAt: { $exists: true }
                    },
                    {
                        keepContent: false
                    }
                );
                // subscribe
                const newSubscription = await SubscriptionModel.create({
                    userId,
                    channelId
                });

                console.log('Subscription', newSubscription);

                // Check if channel owner, if yes then update creatorUnsubscribed: true
                if (findCourse.createdBy.toString().trim() === userId.toString().trim()) {
                    await ChannelModel.updateOne(
                        {
                            _id: channelId
                        },
                        {
                            creatorUnsubscribed: false
                        }
                    );
                } else {
                    // Add as a moderator
                    if (enrollmentType === 'Editor') {
                        if (findCourse.owners) {
                            await ChannelModel.updateOne(
                                {
                                    _id: channelId
                                },
                                {
                                    $addToSet: { owners: userId }
                                }
                            );
                        } else {
                            await ChannelModel.updateOne(
                                {
                                    _id: channelId
                                },
                                {
                                    owners: [userId]
                                }
                            );
                        }
                    }
                }

                addSuccess.push(enrollment.index);
            }

            return {
                successful: addSuccess,
                failed,
                error: ''
            };
        } catch (e) {
            console.log(e);
            return {
                successful: [],
                failed: [],
                error: 'Something went wrong. Try again.'
            };
        }
    }
}
