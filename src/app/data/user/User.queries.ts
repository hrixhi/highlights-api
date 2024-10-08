import { UserModel } from '@app/data/user/mongo/User.model';
import { Arg, Field, ObjectType } from 'type-graphql';
import { hashPassword, verifyPassword } from '../methods';
import { SchoolsModel } from '../school/mongo/School.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { UserObject } from './types/User.type';
import { AuthResponseObject } from './types/AuthResponse.type';
import { AdminUsersResponsObject } from './types/AdminUser.type';
import { CueModel } from '../cue/mongo/Cue.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { PerformanceObject } from './types/Performance.type';
import { MessageModel } from '../message/mongo/Message.model';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { GroupModel } from '../group/mongo/Group.model';
import { ThreadModel } from '../thread/mongo/Thread.model';
import { createJWTToken } from '../../../helpers/auth';
import { CueObject } from '../cue/types/Cue.type';
import WorkOS from '@workos-inc/node';
import { WORKOS_API_KEY, WORKOS_CLIENT_ID, REDIRECT_URI } from '../../../helpers/workosCredentials';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '@config/GoogleOauthKeys';
import { GoogleAuthResponseObject } from './types/GoogleAuthResponse.type';
const twilio = require('twilio');
import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } from '@config/TwilioKeys';
import { PhoneNumberResponse } from './types/PhoneNumberResponse.type';

/**
 * User Query Endpoints
 */
@ObjectType()
export class UserQueryResolver {
    @Field((type) => UserObject, {
        description: 'Returns a user by id.',
        nullable: true,
    })
    public async findById(
        @Arg('id', (type) => String)
        id: string
    ) {
        const result: any = await UserModel.findById(id);
        return result;
    }

    @Field((type) => String, {
        description: 'Returns a user role.',
        nullable: true,
    })
    public async getRole(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        const u: any = await UserModel.findById(userId);
        if (u) {
            const user = u.toObject();
            if (user.role && user.role !== '') {
                return user.role;
            }
        }
        return '';
    }

    @Field((type) => [UserObject], {
        description: 'Returns list of users by channelId.',
    })
    public async findByChannelId(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            const subscriptions = await SubscriptionModel.find({
                $and: [{ channelId }, { unsubscribedAt: { $exists: false } }],
            });
            const ids: any[] = [];
            subscriptions.map((subscriber) => {
                ids.push(subscriber.userId);
            });
            return await UserModel.find({ _id: { $in: ids }, deletedAt: undefined });
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    // MAIN APP LOGINS

    @Field((type) => AuthResponseObject)
    public async login(
        @Arg('email', (type) => String)
        email: string,
        @Arg('password', (type) => String)
        password: string
    ) {
        try {
            const user: any = await UserModel.findOne({ email });
            if (user) {
                if (user.authProvider) {
                    return {
                        user: null,
                        error: 'This account is linked with ' + user.authProvider,
                        token: '',
                    };
                }

                if (user.deletedAt) {
                    return {
                        user: null,
                        error: 'User account terminated by school administrator.',
                        token: '',
                    };
                }

                if (user.inactive) {
                    return {
                        user: null,
                        error: 'Account inactive. Contact school administrator.',
                        token: '',
                    };
                }

                const passwordCorrect = await verifyPassword(password, user.password);
                if (passwordCorrect) {
                    await UserModel.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

                    const token = createJWTToken(user._id);

                    console.log({
                        user,
                        error: '',
                        token,
                    });

                    return {
                        user,
                        error: '',
                        token,
                    };
                } else {
                    return {
                        user: null,
                        error: 'Incorrect Password. Try again.',
                        token: '',
                    };
                }
            } else {
                return {
                    user: null,
                    error: 'No user found with this email.',
                    token: '',
                };
            }
        } catch (e) {
            return {
                user: null,
                error: 'Something went wrong. Try again.',
                token: '',
            };
        }
    }

    @Field((type) => AuthResponseObject)
    public async loginFromSso(
        @Arg('code', (type) => String)
        code: string
    ) {
        try {
            const workos = new WorkOS(WORKOS_API_KEY);

            const { profile } = await workos.sso.getProfileAndToken({
                code,
                clientID: WORKOS_CLIENT_ID,
            });

            const user = await UserModel.findOne({
                email: profile.email,
            });

            if (user) {
                await UserModel.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

                const token = createJWTToken(user._id);

                return {
                    user,
                    error: '',
                    token,
                };
            } else {
                return {
                    user: null,
                    error:
                        'No Cues account linked with this profile. Contact your school admin to be added to the roster.',
                    token: '',
                };
            }
        } catch (e) {
            return {
                user: null,
                error: 'Something went wrong. Try again.',
                token: '',
            };
        }
    }

    // ADMIN LOGINS
    @Field((type) => AuthResponseObject)
    public async loginAdmin(
        @Arg('email', (type) => String)
        email: string,
        @Arg('password', (type) => String)
        password: string
    ) {
        try {
            if (!email || !password) {
                return {
                    user: undefined,
                    error: 'Invalid credentials provided.',
                    token: undefined,
                };
            }

            const user = await UserModel.findOne({
                email,
                adminInfo: { $ne: undefined },
            });

            if (!user || !user.password) {
                return {
                    user: undefined,
                    error: 'No admin user found with this email.',
                    token: undefined,
                };
            }

            const passwordCorrect = await verifyPassword(password, user.password);

            if (passwordCorrect) {
                await UserModel.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

                const token = createJWTToken(user._id);

                return {
                    user,
                    error: '',
                    token,
                };
            } else {
                return {
                    user: null,
                    error: 'Incorrect password provided. Try again.',
                    token: '',
                };
            }
        } catch (e) {
            return {
                user: null,
                error: 'Something went wrong. Try again.',
                token: '',
            };
        }
    }

    @Field((type) => [UserObject], { nullable: true })
    public async getSchoolUsers(
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            const users = await UserModel.find({
                schoolId,
                deletedAt: undefined,
                role: { $in: ['instructor', 'student'] },
            });
            return users;
        } catch (e) {
            return null;
        }
    }

    @Field((type) => String)
    public async organisationLogin(
        @Arg('cuesDomain', (type) => String)
        cuesDomain: string,
        @Arg('password', (type) => String)
        password: string
    ) {
        try {
            const s: any = await SchoolsModel.findOne({ cuesDomain });
            if (s) {
                const school = s.toObject();
                const passwordCorrect = await verifyPassword(password, school.password);
                if (passwordCorrect) {
                    return school._id;
                }
            }

            return 'error';
        } catch (e) {
            return 'error';
        }
    }

    @Field((type) => PerformanceObject, {
        description: 'Returns total scores.',
        nullable: true,
    })
    public async getChannelPerformanceReport(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            // channel - score map
            const u: any = await UserModel.findById(userId);
            if (u) {
                const mods = await ModificationsModel.find({
                    channelId,
                    userId,
                    submission: true,
                });

                let score = 0;
                let total = 0;
                let totalAssessments = 0;
                let gradedAssessments = 0;
                let lateAssessments = 0;
                let submittedAssessments = 0;
                let upcomingAssessmentDate = '';

                mods.map((m: any) => {
                    const mod = m.toObject();
                    totalAssessments += 1;

                    // Graded assignments
                    if (mod.gradeWeight !== undefined && mod.gradeWeight !== null) {
                        score += mod.releaseSubmission
                            ? mod.submittedAt && mod.graded
                                ? (mod.score * mod.gradeWeight) / 100
                                : 0
                            : 0;
                        total += mod.releaseSubmission ? mod.gradeWeight : 0;
                    }

                    if (mod.graded && mod.releaseSubmission) {
                        gradedAssessments += 1;
                    }
                    if (mod.submittedAt) {
                        submittedAssessments += 1;
                        if (mod.deadline) {
                            const sub = new Date(mod.submittedAt);
                            const dead = new Date(mod.deadline);
                            if (sub > dead) {
                                lateAssessments += 1;
                            }
                        }
                    }

                    // Check if due date in the future
                    const dueDate = new Date(mod.deadline);
                    if (
                        dueDate > new Date() &&
                        (dueDate < new Date(upcomingAssessmentDate) || !upcomingAssessmentDate)
                    ) {
                        upcomingAssessmentDate = mod.deadline.toUTCString();
                    }
                });

                return {
                    channelId,
                    score: total === 0 ? 0 : ((score / total) * 100).toFixed(2).replace(/\.0+$/, ''),
                    total,
                    totalAssessments,
                    lateAssessments,
                    gradedAssessments,
                    submittedAssessments,
                    upcomingAssessmentDate,
                };
            } else {
                return [];
            }
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => [PerformanceObject], {
        description: 'Returns total scores.',
        nullable: true,
    })
    public async getPerformanceReport(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            // channel - score map
            const u: any = await UserModel.findById(userId);
            if (u) {
                const scoreMap: any = {};
                const totalMap: any = {};
                const totalAssessmentsMap: any = {};
                const gradedAssessmentsMap: any = {};
                const lateAssessmentsMap: any = {};
                const submittedAssessmentsMap: any = {};
                const upcomingAssessmentsMap: any = {};

                const subs = await SubscriptionModel.find({
                    $and: [{ userId }, { keepContent: { $ne: false } }, { unsubscribedAt: { $exists: false } }],
                });

                for (let x = 0; x < subs.length; x++) {
                    if (subs[x]) {
                        const subscription = subs[x].toObject();
                        const mods = await ModificationsModel.find({
                            channelId: subscription.channelId,
                            userId,
                            submission: true,
                        });

                        let score = 0;
                        let total = 0;
                        let totalAssessments = 0;
                        let gradedAssessments = 0;
                        let lateAssessments = 0;
                        let submittedAssesments = 0;
                        let upcomingAssignmentDate = '';

                        mods.map((m: any) => {
                            const mod = m.toObject();
                            totalAssessments += 1;

                            // Graded assignments
                            if (mod.gradeWeight !== undefined && mod.gradeWeight !== null) {
                                score += mod.releaseSubmission
                                    ? mod.submittedAt && mod.graded
                                        ? (mod.score * mod.gradeWeight) / 100
                                        : 0
                                    : 0;
                                total += mod.releaseSubmission ? mod.gradeWeight : 0;
                            }

                            if (mod.graded && mod.releaseSubmission) {
                                gradedAssessments += 1;
                            }
                            if (mod.submittedAt) {
                                submittedAssesments += 1;
                                if (mod.deadline) {
                                    const sub = new Date(mod.submittedAt);
                                    const dead = new Date(mod.deadline);
                                    if (sub > dead) {
                                        lateAssessments += 1;
                                    }
                                }
                            }

                            // Check if due date in the future
                            const dueDate = new Date(mod.deadline);
                            if (
                                dueDate > new Date() &&
                                (dueDate < new Date(upcomingAssignmentDate) || !upcomingAssignmentDate)
                            ) {
                                upcomingAssignmentDate = mod.deadline.toUTCString();
                            }
                        });

                        console.log('Upcoming Assignment Date', upcomingAssignmentDate);

                        scoreMap[subscription.channelId] =
                            total === 0 ? 0 : ((score / total) * 100).toFixed(2).replace(/\.0+$/, '');
                        totalMap[subscription.channelId] = total;
                        totalAssessmentsMap[subscription.channelId] = totalAssessments;
                        lateAssessmentsMap[subscription.channelId] = lateAssessments;
                        gradedAssessmentsMap[subscription.channelId] = gradedAssessments;
                        submittedAssessmentsMap[subscription.channelId] = submittedAssesments;
                        upcomingAssessmentsMap[subscription.channelId] = upcomingAssignmentDate;
                    }
                }

                // total assessments

                const toReturn: any[] = [];
                Object.keys(scoreMap).map((key: any) => {
                    toReturn.push({
                        channelId: key,
                        score: scoreMap[key],
                        total: totalMap[key],
                        totalAssessments: totalAssessmentsMap[key],
                        lateAssessments: lateAssessmentsMap[key],
                        gradedAssessments: gradedAssessmentsMap[key],
                        submittedAssessments: submittedAssessmentsMap[key],
                        upcomingAssessmentDate: upcomingAssessmentsMap[key],
                    });
                });

                return toReturn;
            } else {
                return [];
            }
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => [UserObject])
    public async getAllUsers(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            const u = await UserModel.findById(userId);
            if (u) {
                const user = u.toObject();
                const subs = await SubscriptionModel.find({
                    $and: [{ userId }, { keepContent: { $ne: false } }, { unsubscribedAt: { $exists: false } }],
                });

                const channelIds: any = [];
                const userIds: any[] = [];
                const userMap: any = {};

                subs.map((s: any) => {
                    const sub = s.toObject();
                    channelIds.push(sub.channelId);
                });

                const allSubs = await SubscriptionModel.find({
                    $and: [
                        { channelId: { $in: channelIds } },
                        { keepContent: { $ne: false } },
                        { unsubscribedAt: { $exists: false } },
                    ],
                });

                allSubs.map((s: any) => {
                    const sub = s.toObject();
                    if (sub.userId.toString().trim() !== userId.toString().trim()) {
                        userIds.push(sub.userId);
                        if (userMap[sub.userId]) {
                            userMap[sub.userId].push(sub.channelId);
                        } else {
                            userMap[sub.userId] = [sub.channelId];
                        }
                    }
                });

                const toReturn: any[] = [];

                if (user.role === 'instructor') {
                    const data = await UserModel.find({
                        _id: { $in: userIds },
                        schoolId: user.schoolId ? user.schoolId : undefined,
                    });
                    data.map((u: any) => {
                        const obj = u.toObject();
                        toReturn.push({ ...obj, channelIds: userMap[obj._id] });
                    });
                } else {
                    const data = await UserModel.find({
                        _id: { $in: userIds },
                        role: 'instructor',
                        schoolId: user.schoolId ? user.schoolId : undefined,
                    });
                    data.map((u: any) => {
                        const obj = u.toObject();
                        toReturn.push({ ...obj, channelIds: userMap[obj._id] });
                    });
                }

                return toReturn;
            } else {
                return [];
            }
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => String)
    public async search(
        @Arg('term', (type) => String)
        term: string,
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            // search through cues - messages - threads - channels
            // return result, type, add. data to lead to the result

            const toReturn: any = {};
            const subscriptions = await SubscriptionModel.find({
                $and: [{ userId }, { keepContent: { $ne: false } }, { unsubscribedAt: { $exists: false } }],
            });
            const channelIds = subscriptions.map((s: any) => {
                const sub = s.toObject();
                return sub.channelId;
            });

            // Channels
            const channels = await ChannelModel.find({ name: new RegExp(term, 'i') });
            toReturn['channels'] = channels;

            // Cues
            const personalCues = await CueModel.find({
                channelId: { $exists: false },
                createdBy: userId,
                cue: new RegExp(term, 'i'),
            });
            toReturn['personalCues'] = personalCues;

            const channelCues = await CueModel.find({
                channelId: { $in: channelIds },
                cue: new RegExp(term, 'i'),
            });
            toReturn['channelCues'] = channelCues;

            // Messages
            const groups = await GroupModel.find({
                users: userId,
            });
            const groupIds = groups.map((g: any) => {
                const group = g.toObject();
                return group._id;
            });

            let groupUsersMap: any = {};

            groups.map((g: any) => {
                const group = g.toObject();
                groupUsersMap[group._id.toString()] = group.users;
            });

            const messages = await MessageModel.find({
                message: new RegExp(term, 'i'),
                groupId: { $in: groupIds },
            });

            const messagesWithUsers = messages.map((mess: any) => {
                const messObj = mess.toObject();

                const users = groupUsersMap[messObj.groupId.toString()];

                if (users) {
                    return {
                        ...messObj,
                        users,
                    };
                }

                return {
                    ...messObj,
                    users: [],
                };
            });

            toReturn['messages'] = messagesWithUsers;

            // Need to add the users to each message

            // threads
            const threads = await ThreadModel.find({
                channelId: { $in: channelIds },
                message: new RegExp(term),
            });
            toReturn['threads'] = threads;

            // Add createdBy for all the

            return JSON.stringify(toReturn);
        } catch (e) {
            console.log(e);
            return '';
        }
    }

    @Field((type) => CueObject, { nullable: true })
    public async fetchAnnotationsForViewer(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('cueId', (type) => String)
        cueId: string,
        @Arg('myNotes', (type) => Boolean, { nullable: true })
        myNotes?: boolean
    ) {
        try {
            let mod: any = {};

            if (myNotes) {
                mod = await CueModel.findOne({
                    _id: cueId,
                    createdBy: userId,
                });
            } else {
                mod = await ModificationsModel.findOne({
                    cueId,
                    userId,
                });
            }
            console.log('Mod', mod);

            if (mod !== null && mod !== undefined) {
                return mod;
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    @Field((type) => Boolean)
    public async isSsoAvailable(
        @Arg('ssoDomain', (type) => String)
        ssoDomain: string
    ) {
        try {
            const foundSSO = await SchoolsModel.findOne({
                ssoDomain,
                ssoEnabled: true,
                workosConnection: { $ne: undefined },
            });

            if (foundSSO && foundSSO.workosConnection && foundSSO.workosConnection.state === 'active') {
                return true;
            }

            return false;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => String, { nullable: true })
    public async getSsoLink(
        @Arg('ssoDomain', (type) => String)
        ssoDomain: string
    ) {
        try {
            const foundSSO = await SchoolsModel.findOne({
                ssoDomain,
                ssoEnabled: true,
                workosConnection: { $ne: undefined },
            });

            if (foundSSO && foundSSO.workosConnection && foundSSO.workosConnection.state === 'active') {
                const workos = new WorkOS(WORKOS_API_KEY);

                const authorizationURL = workos.sso.getAuthorizationURL({
                    clientID: WORKOS_CLIENT_ID,
                    redirectURI: REDIRECT_URI,
                    connection: foundSSO.workosConnection.id,
                });

                return authorizationURL;
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    @Field((type) => String, { nullable: true })
    public async getSsoLinkNative(
        @Arg('ssoDomain', (type) => String)
        ssoDomain: string,
        @Arg('redirectURI', (type) => String)
        redirectURI: string
    ) {
        try {
            const foundSSO = await SchoolsModel.findOne({
                ssoDomain,
                ssoEnabled: true,
                workosConnection: { $ne: undefined },
            });

            if (foundSSO && foundSSO.workosConnection && foundSSO.workosConnection.state === 'active') {
                const workos = new WorkOS(WORKOS_API_KEY);

                const authorizationURL = workos.sso.getAuthorizationURL({
                    clientID: WORKOS_CLIENT_ID,
                    redirectURI,
                    connection: foundSSO.workosConnection.id,
                });

                return authorizationURL;
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    @Field((type) => String, { nullable: true })
    public async getUsernamesForAnnotation(
        @Arg('cueId', (type) => String)
        cueId: string
    ) {
        try {
            const fetchCue = await CueModel.findById(cueId);

            if (!fetchCue) return null;

            const fetchCourse = await ChannelModel.findById(fetchCue.channelId);

            if (!fetchCourse) return null;

            const ownersSet = new Set();

            ownersSet.add(fetchCourse.createdBy);

            if (fetchCourse.owners && fetchCourse.owners.length !== 0) {
                fetchCourse.owners.map((id: string) => {
                    ownersSet.add(id);
                });
            }

            const userIds = Array.from(ownersSet);

            const fetchUsers = await UserModel.find({
                _id: { $in: userIds },
            });

            const userIdMap: any = {};

            fetchUsers.map((user: any) => {
                const obj = user.toObject();

                userIdMap[obj._id] = obj.fullName;
            });

            return JSON.stringify(userIdMap);
        } catch (e) {
            return null;
        }
    }

    @Field((type) => AdminUsersResponsObject, { nullable: true })
    public async getAllUsersAdmin(
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            if (!schoolId) {
                return {
                    users: [],
                    gradesAndSections: [],
                    error: 'School Id must be provided',
                };
            }

            // GET USERS WITH SCHOOL ID

            const fetchSchoolUsers = await UserModel.find({
                schoolId,
                role: { $in: ['student', 'parent'] },
                deletedAt: undefined,
            });

            if (!fetchSchoolUsers) {
                return {
                    users: [],
                    gradesAndSections: [],
                    error: 'Something went wrong.',
                };
            }

            const gradesSections = new Set();
            const users: any[] = [];

            for (let i = 0; i < fetchSchoolUsers.length; i++) {
                const user = fetchSchoolUsers[i].toObject();

                if (!user.grade || !user.section) {
                    return;
                }

                gradesSections.add(user.grade + '-' + user.section);

                users.push({
                    _id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    grade: user.grade,
                    section: user.section,
                });
            }

            console.log({
                users,
                gradesAndSections: Array.from(gradesSections),
                error: '',
            });

            return {
                users,
                gradesAndSections: Array.from(gradesSections),
                error: '',
            };
        } catch (e) {
            return {
                users: [],
                gradesAndSections: [],
                error: 'Something went wrong.',
            };
        }
    }

    @Field((type) => [UserObject], { nullable: true })
    public async getAllInstructorsAdmin(
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            if (!schoolId) {
                return [];
            }

            // GET USERS WITH SCHOOL ID
            const fetchSchoolUsers = await UserModel.find({
                schoolId,
                role: 'instructor',
                deletedAt: undefined,
            });

            if (!fetchSchoolUsers) {
                return [];
            }

            return fetchSchoolUsers;
        } catch (e) {
            return [];
        }
    }

    @Field((type) => GoogleAuthResponseObject)
    public async getGoogleAuth(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            const fetchUser = await UserModel.findById(userId);

            if (!fetchUser) return '';

            const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

            // WE HAVE REFRESH TOKEN SO
            if (fetchUser && fetchUser.googleOauthRefreshToken) {
                oAuth2Client.setCredentials({ refresh_token: fetchUser.googleOauthRefreshToken });

                const res = await oAuth2Client.getAccessToken();
                // RETURN REDIRECT URL
                if (res.token) {
                    return {
                        access_token: res.token,
                    };
                } else {
                    return {
                        error: 'Something went wrong. Try Again.',
                    };
                }
            } else {
                const authorizeUrl = oAuth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: 'https://www.googleapis.com/auth/drive.readonly',
                });

                return {
                    authorizeUrl,
                };
            }
        } catch (e) {
            return {
                error: 'Something went wrong. Try Again.',
            };
        }
    }

    @Field((type) => PhoneNumberResponse, { nullable: true })
    public async validPhoneNumber(
        @Arg('phoneNumber', (type) => String)
        phoneNumber: string
    ) {
        try {
            const client = new twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

            return client.lookups.v2
                .phoneNumbers(phoneNumber)
                .fetch()
                .then((res: any) => {
                    console.log('Res', res);

                    if (res.valid) {
                        return {
                            callingCountryCode: res.callingCountryCode,
                            countryCode: res.countryCode,
                        };
                    } else {
                        return null;
                    }
                })
                .catch((e: any) => {
                    console.log('Error', e);
                    return null;
                });
        } catch (e) {
            console.log('error', e);
            return null;
        }
    }

    @Field((type) => [UserObject], { nullable: true })
    public async getAllAdmins(
        @Arg('schoolId', (type) => String)
        schoolId: string,
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            if (!schoolId) {
                return [];
            }

            // GET USERS WITH SCHOOL ID
            const fetchSchoolAdmins = await UserModel.find({
                $and: [
                    {
                        _id: { $ne: userId },
                    },
                    {
                        schoolId,
                        role: 'admin',
                        deletedAt: undefined,
                    },
                ],
            });

            if (!fetchSchoolAdmins) {
                return [];
            }

            return fetchSchoolAdmins;
        } catch (e) {
            return [];
        }
    }
}
