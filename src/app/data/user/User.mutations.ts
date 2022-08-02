import { hashPassword, verifyPassword } from '@app/data/methods';
import { UserModel } from '@app/data/user/mongo/User.model';
import { EmailService } from '../../../emailservice/Postmark';
import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { UserObject, ZoomObject } from './types/User.type';
import { UserCreate } from './input-types/UserCreate.input';
import { SchoolsModel } from '../school/mongo/School.model';
import { ThreadModel } from '../thread/mongo/Thread.model';
import { ThreadStatusModel } from '../thread-status/mongo/thread-status.model';
import axios from 'axios';
import { createJWTToken } from '../../../helpers/auth';
import { AuthResponseObject } from './types/AuthResponse.type';
import { AddUsersResponseObject } from './types/AddUsersResponse.type';
import { zoomClientId, zoomClientSecret, zoomRedirectUri } from '../../../helpers/zoomCredentials';
import { NewUserAdmin } from './input-types/NewUserAdmin.input';
import { EditUserAdmin } from './input-types/EditUserAdmin.input';
import { AddImportedUsersResponse } from './types/AddImportedUsersResponse.type';
import { StreamChat } from 'stream-chat';
import { STREAM_CHAT_API_KEY, STREAM_CHAT_API_SECRET } from '@config/StreamKeys';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '@config/GoogleOauthKeys';
import { OAuth2Client } from 'google-auth-library';
const { google } = require('googleapis');
import * as AWS from 'aws-sdk';
const customId = require('custom-id');
import request from 'request-promise';
import shortid from 'shortid';
import { nanoid } from 'nanoid';
import { NewAdminInputObject } from './input-types/NewAdmin.input';
import { EditAdminInputObject } from './input-types/EditAdmin.input';

/**
 * User Mutation Endpoints
 */
@ObjectType()
export class UserMutationResolver {
    @Field((type) => UserObject, {
        description: 'Used when you want to create user.',
        nullable: true,
    })
    public async create(
        @Arg('fullName', (type) => String)
        fullName: string,
        @Arg('displayName', (type) => String)
        displayName: string,
        @Arg('notificationId', (type) => String)
        notificationId: string
    ) {
        try {
            return await UserModel.create({
                fullName,
                notificationId,
                displayName,
            });
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to update a user.',
        nullable: true,
    })
    public async update(
        @Arg('fullName', (type) => String)
        fullName: string,
        @Arg('displayName', (type) => String)
        displayName: string,
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('avatar', (type) => String, { nullable: true })
        avatar?: string
    ) {
        try {
            const updateUser = await UserModel.updateOne(
                { _id: userId },
                {
                    fullName,
                    displayName,
                    avatar: avatar ? avatar : undefined,
                }
            );

            const serverClient = StreamChat.getInstance(STREAM_CHAT_API_KEY, STREAM_CHAT_API_SECRET);

            if (updateUser) {
                // UPDATE STREAM PROFILE FOR USER
                serverClient.partialUpdateUser({
                    id: userId,
                    set: {
                        name: fullName,
                        image: avatar,
                    },
                });
            }

            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to update a user.',
        nullable: true,
    })
    public async updateAdminProfile(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('fullName', (type) => String)
        fullName: string,
        @Arg('avatar', (type) => String, { nullable: true })
        avatar?: string,
        @Arg('phoneNumber', (type) => String, { nullable: true })
        phoneNumber?: string
    ) {
        try {
            const updateUser = await UserModel.updateOne(
                { _id: userId },
                {
                    fullName,
                    phoneNumber,
                    avatar: avatar ? avatar : undefined,
                }
            );

            const serverClient = StreamChat.getInstance(STREAM_CHAT_API_KEY, STREAM_CHAT_API_SECRET);

            if (updateUser) {
                // UPDATE STREAM PROFILE FOR USER
                serverClient.partialUpdateUser({
                    id: userId,
                    set: {
                        name: fullName,
                        image: avatar,
                    },
                });
            }

            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'false means entered password is incorrect.',
        nullable: true,
    })
    public async updatePassword(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('currentPassword', (type) => String)
        currentPassword: string,
        @Arg('newPassword', (type) => String)
        newPassword: string
    ) {
        try {
            const u = await UserModel.findById(userId);
            if (u) {
                const user: any = u.toObject();
                const passwordCorrect = await verifyPassword(currentPassword, user.password);
                if (passwordCorrect) {
                    const hash = await hashPassword(newPassword);
                    await UserModel.updateOne({ _id: userId }, { password: hash });
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

    @Field((type) => Boolean, {
        description: 'Updates the notification Id for a user that was not set up on native devices.',
        nullable: true,
    })
    public async updateNotificationId(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('notificationId', (type) => String)
        notificationId: string
    ) {
        try {
            const u = await UserModel.findById(userId);
            if (u) {
                await UserModel.updateOne({ _id: userId }, { notificationId });
                return true;
            } else {
                return false;
            }
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Resets password using email.',
        nullable: true,
    })
    public async resetPassword(
        @Arg('email', (type) => String)
        email: string
    ) {
        try {
            const u = await UserModel.findOne({ email });
            if (u) {
                const newPassword = (Math.random() + Math.random()).toString(36).substring(7);
                const password = newPassword;
                const hash = await hashPassword(newPassword);
                await UserModel.updateOne({ email }, { password: hash });
                const emailService = new EmailService();
                emailService.resetPassword(email, password);
                return true;
            } else {
                return false;
            }
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => String)
    public async signup(
        @Arg('fullName', (type) => String)
        fullName: string,
        @Arg('email', (type) => String)
        email: string,
        @Arg('password', (type) => String, { nullable: true })
        password?: string
    ) {
        try {
            // First lookup document with provided email
            const existingUser = await UserModel.findOne({
                email,
            });

            if (existingUser !== null) {
                return 'An account already exists. Try Signing in.';
            }

            if (!password) return 'Invalid password. Try again.';

            const hash = await hashPassword(password);

            await UserModel.create({
                email,
                fullName,
                displayName: fullName.toLowerCase(),
                notificationId: 'NOT_SET',
                password: hash,
            });

            return 'SUCCESS';
        } catch (e) {
            console.log(e);
            return 'Something went wrong. Try again.';
        }
    }

    @Field((type) => AuthResponseObject)
    public async authWithProvider(
        @Arg('fullName', (type) => String)
        fullName: string,
        @Arg('email', (type) => String)
        email: string,
        @Arg('provider', (type) => String)
        provider: string,
        @Arg('avatar', (type) => String, { nullable: true })
        avatar: string
    ) {
        try {
            // First lookup document with provided email
            const existingUser = await UserModel.findOne({
                email,
            });

            if (existingUser) {
                await UserModel.updateOne({ _id: existingUser._id }, { lastLoginAt: new Date() });

                const token = createJWTToken(existingUser._id);

                return {
                    user: existingUser,
                    error: '',
                    token,
                };
            } else {
                const newUser = await UserModel.create({
                    email,
                    fullName,
                    displayName: fullName.toLowerCase(),
                    notificationId: 'NOT_SET',
                    authProvider: provider,
                    avatar,
                });

                const token = createJWTToken(newUser._id);

                return {
                    user: newUser,
                    error: '',
                    token,
                };
            }
        } catch (e) {
            console.log(e);
            return {
                user: null,
                error: 'Something went wrong. Try again.',
                token: '',
            };
        }
    }

    @Field((type) => Boolean)
    public async saveConfigToCloud(
        @Arg('sleepFrom', (type) => String)
        sleepFrom: string,
        @Arg('sleepTo', (type) => String)
        sleepTo: string,
        @Arg('randomShuffleFrequency', (type) => String)
        randomShuffleFrequency: string,
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('currentDraft', { nullable: true })
        currentDraft?: string
    ) {
        try {
            await UserModel.updateOne(
                { _id: userId },
                {
                    sleepTo,
                    sleepFrom,
                    randomShuffleFrequency,
                    currentDraft,
                    // subscriptions
                }
            );
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    // @Field((type) => String)
    // public async addUsersToOrganisation(
    // 	@Arg("emails", (type) => [String])
    // 	emails: string[],
    // 	@Arg("schoolId", (type) => String)
    // 	schoolId: string,
    // 	@Arg("role", (type) => String)
    // 	role: string,
    // 	@Arg("grade", (type) => String)
    // 	grade: string,
    // 	@Arg("section", (type) => String)
    // 	section: string
    // ) {
    // 	try {
    // 		const from = new Date();
    // 		from.setHours(23, 0, 0);

    // 		const to = new Date();
    // 		to.setHours(7, 0, 0);

    // 		const notificationId = "NOT_SET";
    // 		let flagEmailUserExist = false;
    // 		let emailExists = [];
    // 		for (const email of emails) {
    // 			const user = await UserModel.findOne({ email });
    // 			if (user) {
    // 				emailExists.push(email);
    // 				flagEmailUserExist = true;
    // 			}
    // 		}

    // 		if (flagEmailUserExist) {
    // 			return (emailExists.length > 1 ? "Users with emails " : "User with email ") + emailExists.join(", ") + " already " + (emailExists.length > 1 ? "exist." : "exists.");
    // 		} else {
    // 			for (const email of emails) {
    // 				const username =
    // 					email.split("@")[0] +
    // 					Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();
    // 				const fullName = username;
    // 				const displayName = username;
    // 				const password = username + "@123";
    // 				const dupPassword = password;

    // 				const hash = await hashPassword(password);
    // 				const newUser = await UserModel.create({
    // 					schoolId,
    // 					email,
    // 					fullName,
    // 					displayName,
    // 					password: hash,
    // 					notificationId,
    // 					randomShuffleFrequency: "1-D",
    // 					sleepFrom: from,
    // 					sleepTo: to,
    // 					currentDraft: "",
    // 					role,
    // 					grade: role === "instructor" || grade === "-" ? undefined : grade,
    // 					section:
    // 						role === "instructor" || section === "-" ? undefined : section,
    // 				});

    // 				const emailService = new EmailService();
    // 				const org: any = await SchoolsModel.findById(schoolId);
    // 				emailService.newAccountAddedToOrgConfirm(
    // 					email,
    // 					fullName,
    // 					dupPassword,
    // 					org.name
    // 				);

    // 			}

    // 			return `${emails.length} users added to organization`;
    // 		}
    // 	} catch (e) {
    // 		return "Error: Somthing went wrong";
    // 	}
    // }
    @Field((type) => String)
    public async updateUserAdmin(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('email', (type) => String)
        email: string,
        @Arg('fullName', (type) => String)
        fullName: string,
        @Arg('role', (type) => String)
        role: string,
        @Arg('preferredName', (type) => String, { nullable: true })
        preferredName?: string,
        @Arg('sisId', (type) => String, { nullable: true })
        sisId?: string,
        @Arg('gradYear', (type) => Number, { nullable: true })
        gradYear?: number,
        @Arg('grade', (type) => String, { nullable: true })
        grade?: string,
        @Arg('section', (type) => String, { nullable: true })
        section?: string,
        @Arg('avatar', (type) => String, { nullable: true })
        avatar?: string
    ) {
        try {
            // Check if sisID exist
            if (sisId && sisId !== '') {
                const checkExistingUser = await UserModel.findOne({
                    sisId,
                });

                if (checkExistingUser && checkExistingUser._id && checkExistingUser._id.toString() !== userId) {
                    return 'DUPLICATE_SIS_ID';
                }
            }

            const updateUser = await UserModel.updateOne(
                {
                    _id: userId,
                },
                {
                    email,
                    fullName,
                    role,
                    sisId: sisId && sisId ? sisId : undefined,
                    preferredName: preferredName ? preferredName : undefined,
                    gradYear: gradYear ? gradYear : undefined,
                    grade: role === 'instructor' || grade === '-' ? undefined : grade,
                    section: role === 'instructor' || section === '-' ? undefined : section,
                    avatar: avatar ? avatar : undefined,
                }
            );

            return 'SUCCESS';
        } catch (e) {
            console.log('error', e);
            return 'ERROR';
        }
    }

    @Field((type) => AddUsersResponseObject)
    public async addUsersToOrganisation(
        @Arg('users', (type) => [UserCreate])
        users: UserCreate[],
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            const fetchSchool = await SchoolsModel.findOne({
                _id: schoolId,
            });

            if (!fetchSchool) {
                return {
                    successful: [],
                    failed: [],
                    error: 'No org found with this School id',
                };
            }

            const notificationId = 'NOT_SET';
            let schoolIdExist: string[] = [];
            let sisIdExist: string[] = [];
            let addSuccess: string[] = [];
            let failedToAdd: string[] = [];

            for (const user of users) {
                const fetchUser = await UserModel.findOne({
                    email: user.email,
                });

                if (fetchUser) {
                    let existingUser = fetchUser.toObject();

                    if (
                        !existingUser.schoolId ||
                        existingUser.schoolId === '' ||
                        (existingUser.schoolId && existingUser.schoolId.toString() === schoolId)
                    ) {
                        await UserModel.updateOne(
                            {
                                email: user.email,
                            },
                            {
                                schoolId,
                                fullName: user.fullName,
                                role: user.role,
                                grade: user.role === 'instructor' || user.grade === '-' ? undefined : user.grade,
                                section: user.role === 'instructor' || user.section === '-' ? undefined : user.section,
                                sisId: user.sisId && user.sisId !== '' ? user.sisId : undefined,
                                preferredName: user.preferredName ? user.preferredName : undefined,
                                gradYear: user.gradYear ? user.gradYear : undefined,
                                deletedAt: undefined,
                            }
                        );

                        const emailService = new EmailService();
                        const org: any = await SchoolsModel.findById(schoolId);

                        emailService.existingAccountAddedToOrgConfirm(user.email, user.fullName, org.name);

                        addSuccess.push(user.email);
                    } else {
                        schoolIdExist.push(user.email);
                    }
                } else {
                    // Check for duplicate SIS ID if it is present
                    if (user.sisId && user.sisId !== '') {
                        const existingUserWithId = await UserModel.findOne({
                            schoolId,
                            sisId: user.sisId,
                        });

                        console.log('ExistingUserWithSisID', existingUserWithId);

                        if (existingUserWithId && existingUserWithId._id) {
                            sisIdExist.push(user.email);
                            continue;
                        }
                    }

                    // Create new user
                    const username =
                        user.email.split('@')[0] + Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();
                    const fullName = user.fullName;
                    const displayName = user.fullName;
                    const password = username + '@123';
                    const dupPassword = password;

                    const hash = await hashPassword(password);
                    const newUser = await UserModel.create({
                        schoolId,
                        email: user.email.toLowerCase(),
                        fullName,
                        displayName,
                        password: hash,
                        notificationId,
                        currentDraft: '',
                        role: user.role,
                        grade: user.role === 'instructor' || user.grade === '-' ? undefined : user.grade,
                        section: user.role === 'instructor' || user.section === '-' ? undefined : user.section,
                        sisId: user.sisId && user.sisId ? user.sisId : undefined,
                        preferredName: user.preferredName ? user.preferredName : undefined,
                        gradYear: user.gradYear ? user.gradYear : undefined,
                    });

                    if (!newUser || !newUser.email) {
                        failedToAdd.push(user.email);
                        continue;
                    } else {
                        addSuccess.push(newUser.email);
                    }

                    const emailService = new EmailService();
                    const org: any = await SchoolsModel.findById(schoolId);

                    if (!fetchSchool.ssoEnabled || !fetchSchool.workosConnection) {
                        // If school uses SSO then don't email passwords for the users
                        emailService.newAccountAddedToOrgConfirm(user.email, fullName, dupPassword, org.name);
                    } else {
                        emailService.existingAccountAddedToOrgConfirm(user.email, user.fullName, org.name);
                    }
                }
            }

            return {
                successful: addSuccess,
                schoolIdExist,
                sisIdExist,
                failedToAdd,
                error: '',
            };
        } catch (e) {
            return {
                successful: [],
                schoolIdExist: [],
                sisIdExist: [],
                failedToAdd: [],
                error: 'Error: Somthing went wrong',
            };
            // return "Error: Somthing went wrong";
        }
    }

    /**
     * Description: Delete all user personal info and retain him as a
     * @param ids
     * @returns
     */
    @Field((type) => Boolean)
    public async deleteUsersHard(
        @Arg('ids', (type) => [String])
        ids: string[],
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            const fetchSchool = await SchoolsModel.findById(schoolId);

            if (!fetchSchool) return false;

            for (let i = 0; i < ids.length; i++) {
                const userId = ids[i];

                const fetchUser = await UserModel.findById(userId);

                if (!fetchUser) {
                    continue;
                }

                const userEmail = fetchUser.email;
                const userName = fetchUser.fullName;

                shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');

                const deleteId = shortid.generate();

                let parent1Id;
                let parent2Id;

                if (fetchUser.parent1) {
                    parent1Id = fetchUser.parent1._id;
                }

                if (fetchUser.parent2) {
                    parent2Id = fetchUser.parent2._id;
                }

                // HARD DELETE INVOLVES REPLACING USER PERSONAL INFO WITH FAKE DELETE ID

                await UserModel.updateOne(
                    {
                        _id: userId,
                    },
                    {
                        fullName: 'Deleted User #' + deleteId,
                        displayName: deleteId,
                        email: 'deleted_user_' + deleteId + '@learnwithcues.com',
                        notificationId: 'NOT_SET',
                        avatar: undefined,
                        parent1: undefined,
                        parent2: undefined,
                        personalInfo: undefined,
                        zoomInfo: undefined,
                        googleOauthRefreshToken: undefined,
                        streamToken: undefined,
                        deletedAt: new Date(),
                    }
                );

                await SubscriptionModel.updateMany(
                    {
                        userId,
                        keepContent: { $exists: false },
                    },
                    {
                        unsubscribedAt: new Date(),
                        keepContent: true,
                        archivedUser: true,
                    }
                );

                const serverClient = StreamChat.getInstance(STREAM_CHAT_API_KEY, STREAM_CHAT_API_SECRET);

                // First we set the user to anonymous mode
                await serverClient.upsertUser({
                    id: userId,
                    name: 'Deleted User #' + deleteId,
                    image: '',
                    email: 'deleted_user_' + deleteId + '@learnwithcues.com',
                });

                // Next we will deactivate the user
                await serverClient.deactivateUser(userId, {
                    mark_messages_deleted: true,
                });

                // REMOVE USER AS OWNER FROM ANY CHANNELS
                await ChannelModel.updateMany(
                    {
                        owners: userId,
                    },
                    {
                        $pull: { owners: userId },
                    }
                );

                // IF CHANNEL CREATED BY USER THAT IS UNSUBSCRIBED
                await ChannelModel.updateMany(
                    {
                        createdBy: userId,
                    },
                    {
                        creatorUnsubscribed: true,
                    }
                );

                // If school id is part of
                if (parent1Id) {
                    // Write code here to pull
                }

                if (parent2Id) {
                    // Same as above
                }

                // Send email to user confirming their account was deleted successfully
                const emailService = new EmailService();
                emailService.deleteUserConfirmation(userName, userEmail, fetchSchool.name);
            }

            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean)
    public async changeInactiveStatus(
        @Arg('inactive', (type) => Boolean)
        inactive: boolean,
        @Arg('ids', (type) => [String])
        ids: string[]
    ) {
        try {
            // If making inactive then clear the notification id so that no new notifications are sent
            if (inactive) {
                await UserModel.updateMany({ _id: { $in: ids } }, { inactive, notificationId: 'NOT_SET' });
            } else {
                await UserModel.updateMany({ _id: { $in: ids } }, { inactive });
            }

            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => String, {
        description: 'Used when you want to remove user.',
    })
    public async deleteByEmail(
        @Arg('emails', (type) => [String])
        emails: string[],
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            let flagNotExist = true;
            let emailNotExist: string[] = [];
            for (let i = 0; i < emails.length; i++) {
                const email = emails[i];
                const user = await UserModel.findOne({ email, schoolId });
                if (!user) {
                    flagNotExist = false;
                    emailNotExist.push(email);
                }
            }

            if (flagNotExist) {
                await UserModel.updateMany(
                    {
                        schoolId,
                        email: { $in: emails },
                    },
                    {
                        deletedAt: new Date(),
                        notificationId: 'NOT_SET',
                    }
                );
                for (let i = 0; i < emails.length; i++) {
                    const email = emails[i];

                    // Fetch user first
                    const user = await UserModel.findOne({ email, schoolId });

                    if (!user) return;

                    // Unsubscriber user from all the channels
                    await SubscriptionModel.updateMany(
                        {
                            userId: user._id,
                            keepContent: { $exists: false },
                        },
                        {
                            unsubscribedAt: new Date(),
                            keepContent: true,
                        }
                    );
                }

                return (emails.length > 1 ? 'Users' : 'User') + ' removed successfully.';
            } else {
                if (emailNotExist.length > 0) {
                    return (
                        (emailNotExist.length > 1 ? 'Emails ' : 'Email ') +
                        emailNotExist.join(', ') +
                        (emailNotExist.length > 1 ? " don't exist." : " doesn't exist.")
                    );
                } else {
                    return 'Email not exists.';
                }
            }

            //return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean)
    public async bulkEditStudents(
        @Arg('ids', (type) => [String])
        ids: string[],
        @Arg('grade', (type) => String)
        grade: string,
        @Arg('section', (type) => String)
        section: string
    ) {
        try {
            ids.map(async (id) => {
                const user = await UserModel.findById(id);
                if (user && user.role === 'student') {
                    await UserModel.updateOne(
                        { _id: id },
                        {
                            grade,
                            section,
                        }
                    );
                }
            });
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean)
    public async inviteByEmail(
        @Arg('emails', (type) => [String])
        emails: string[],
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            const from = new Date();
            from.setHours(23, 0, 0);
            const to = new Date();
            to.setHours(7, 0, 0);
            const notificationId = 'NOT_SET';

            const channel: any = await ChannelModel.findById(channelId);
            const owner: any = await UserModel.findById(channel.createdBy);
            const schoolId = owner.schoolId ? owner.schoolId : undefined;

            emails.forEach(async (email) => {
                const user = await UserModel.findOne({ email });
                // if user exists
                if (user) {
                    // Check if user already exists in the channel (What if channel member is inactive? )
                    const subscriptionFound = await SubscriptionModel.findOne({
                        userId: user._id,
                        channelId: channel._id,
                    });

                    if (subscriptionFound) {
                        return;
                    }
                    // if owner is part of org, user should be part of org
                    if (schoolId) {
                        if (user.schoolId && user.schoolId.toString().trim() === schoolId.toString().trim()) {
                            // Subscribe the user
                            const pastSubs = await SubscriptionModel.find({
                                userId: user._id,
                                channelId: channel._id,
                            });
                            if (pastSubs.length === 0) {
                                const channelCues = await CueModel.find({
                                    channelId: channel._id,
                                    limitedShares: { $ne: true },
                                });
                                channelCues.map(async (cue: any) => {
                                    const cueObject = cue.toObject();
                                    const duplicate = { ...cueObject };
                                    delete duplicate._id;
                                    delete duplicate.deletedAt;
                                    delete duplicate.__v;
                                    duplicate.cueId = cue._id;
                                    duplicate.cue = '';
                                    duplicate.userId = user._id;
                                    duplicate.score = 0;
                                    duplicate.graded = false;
                                    const u = await ModificationsModel.create(duplicate);
                                });
                            }

                            const threads = await ThreadModel.find({
                                channelId: channel._id,
                                isPrivate: false,
                            });
                            threads.map(async (t) => {
                                const thread = t.toObject();
                                await ThreadStatusModel.create({
                                    userId: user._id,
                                    channelId: channel._id,
                                    cueId: thread.cueId ? thread.cueId : null,
                                    threadId: thread.parentId ? thread.parentId : thread._id,
                                });
                            });

                            await SubscriptionModel.updateMany(
                                {
                                    userId: user._id,
                                    channelId: channel._id,
                                    unsubscribedAt: { $exists: true },
                                },
                                {
                                    keepContent: false,
                                }
                            );
                            await SubscriptionModel.create({
                                userId: user._id,
                                channelId: channel._id,
                            });
                            // send email
                            const emailService = new EmailService();
                            emailService.inviteByEmail(user.email ? user.email : '', channel.name);
                        }
                        // else do nothing
                    } else {
                        // Subscribe the user
                        const pastSubs = await SubscriptionModel.find({
                            userId: user._id,
                            channelId: channel._id,
                        });
                        if (pastSubs.length === 0) {
                            const channelCues = await CueModel.find({
                                channelId: channel._id,
                                limitedShares: { $ne: true },
                            });
                            channelCues.map(async (cue: any) => {
                                const cueObject = cue.toObject();
                                const duplicate = { ...cueObject };
                                delete duplicate._id;
                                delete duplicate.deletedAt;
                                delete duplicate.__v;
                                duplicate.cueId = cue._id;
                                duplicate.cue = '';
                                duplicate.userId = user._id;
                                duplicate.score = 0;
                                duplicate.graded = false;
                                const u = await ModificationsModel.create(duplicate);
                            });
                        }

                        const threads = await ThreadModel.find({
                            channelId: channel._id,
                            isPrivate: false,
                        });
                        threads.map(async (t) => {
                            const thread = t.toObject();
                            await ThreadStatusModel.create({
                                userId: user._id,
                                channelId: channel._id,
                                cueId: thread.cueId ? thread.cueId : null,
                                threadId: thread.parentId ? thread.parentId : thread._id,
                            });
                        });

                        await SubscriptionModel.updateMany(
                            {
                                userId: user._id,
                                channelId: channel._id,
                                unsubscribedAt: { $exists: true },
                            },
                            {
                                keepContent: false,
                            }
                        );
                        await SubscriptionModel.create({
                            userId: user._id,
                            channelId: channel._id,
                        });
                        // send email
                        const emailService = new EmailService();
                        emailService.inviteByEmail(user.email ? user.email : '', channel.name);
                    }
                } else {
                    if (!schoolId) {
                        // create user
                        const username =
                            email.split('@')[0] + Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();
                        const fullName = username;
                        const displayName = username;
                        const password = username + '@123';
                        const hash = await hashPassword(password);
                        const newUser = await UserModel.create({
                            email,
                            fullName,
                            displayName,
                            password: hash,
                            notificationId,
                            randomShuffleFrequency: '1-D',
                            sleepFrom: from,
                            sleepTo: to,
                            currentDraft: '',
                        });

                        // give default CUES
                        // const defaultCues: any = await CueModel.find({
                        // 	_id: {
                        // 		$in: [
                        // 			"60ab0dbf3e057c171516ee98",
                        // 			"60ab0dbf3e057c171516ee99",
                        // 			"60ab0dbf3e057c171516ee9a",
                        // 			"60ab28013e057c171516eeb7",
                        // 		],
                        // 	},
                        // });

                        // const newCues: any[] = [];
                        // defaultCues.map((c: any) => {
                        // 	const newCue = c.toObject();
                        // 	delete newCue.__v;
                        // 	delete newCue._id;
                        // 	const updatedCue = {
                        // 		...newCue,
                        // 		createdBy: newUser._id,
                        // 		date: new Date(),
                        // 	};
                        // 	newCues.push(updatedCue);
                        // });
                        // await CueModel.insertMany(newCues);

                        // Subscribe the user
                        const pastSubs = await SubscriptionModel.find({
                            userId: newUser._id,
                            channelId: channel._id,
                        });

                        if (pastSubs.length === 0) {
                            const channelCues = await CueModel.find({
                                channelId: channel._id,
                            });
                            channelCues.map(async (cue: any) => {
                                const cueObject = cue.toObject();
                                const duplicate = { ...cueObject };
                                delete duplicate._id;
                                delete duplicate.deletedAt;
                                delete duplicate.__v;
                                duplicate.cueId = cue._id;
                                duplicate.cue = '';
                                duplicate.userId = newUser._id;
                                duplicate.score = 0;
                                duplicate.graded = false;
                                const u = await ModificationsModel.create(duplicate);
                            });
                        }
                        await SubscriptionModel.updateMany(
                            {
                                userId: newUser._id,
                                channelId: channel._id,
                                unsubscribedAt: { $exists: true },
                            },
                            {
                                keepContent: false,
                            }
                        );
                        await SubscriptionModel.create({
                            userId: newUser._id,
                            channelId: channel._id,
                        });
                        // send email
                        const emailService = new EmailService();
                        emailService.newAccountInviteByEmail(email, password, channel.name);
                    }
                }
            });
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field((type) => Boolean)
    public async removeZoom(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            let accessToken = '';
            const u: any = await UserModel.findById(userId);
            if (u) {
                const user = u.toObject();

                if (!user.zoomInfo) {
                    return false;
                } else {
                    accessToken = user.zoomInfo.accessToken;
                }

                const b = Buffer.from(zoomClientId + ':' + zoomClientSecret);

                const date = new Date();
                const expiresOn = new Date(user.zoomInfo.expiresOn);

                if (expiresOn <= date) {
                    // refresh access token

                    const zoomRes: any = await axios.post(
                        `https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${user.zoomInfo.refreshToken}`,
                        undefined,
                        {
                            headers: {
                                Authorization: `Basic ${b.toString('base64')}`,
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                        }
                    );

                    if (zoomRes.status !== 200) {
                        return 'error';
                    }

                    const zoomData: any = zoomRes.data;

                    const eOn = new Date();
                    eOn.setSeconds(
                        eOn.getSeconds() + (Number.isNaN(Number(zoomData.expires_in)) ? 0 : Number(zoomData.expires_in))
                    );

                    accessToken = zoomData.access_token;

                    await UserModel.updateOne(
                        { _id: userId },
                        {
                            zoomInfo: {
                                ...user.zoomInfo,
                                accessToken: zoomData.access_token,
                                refreshToken: zoomData.refresh_token,
                                expiresOn: eOn, // saved as a date
                            },
                        }
                    );
                }

                const zoomRes: any = await axios.post(`https://zoom.us/oauth/revoke?token=${accessToken}`, undefined, {
                    headers: {
                        Authorization: `Basic ${b.toString('base64')}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                });

                if (!zoomRes || !zoomRes.data) {
                    return false;
                }

                const zoomData: any = zoomRes.data;

                if (zoomData.status === 'success') {
                    return true;
                }

                return false;
            }

            return false;
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }

    @Field((type) => Boolean)
    public async removeGoogleOauth(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            const removeAuth = await UserModel.updateOne(
                {
                    _id: userId,
                },
                {
                    googleOauthRefreshToken: undefined,
                }
            );

            if (removeAuth) {
                return true;
            } else {
                return false;
            }
        } catch (e) {
            console.log('error', e);
            return false;
        }
    }

    @Field((type) => Boolean)
    public async connectGoogleOauth(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('code', (type) => String)
        code: string
    ) {
        try {
            const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

            // Now that we have the code, use that to acquire tokens.
            const res: any = await oAuth2Client.getToken(code);

            console.log('Res', res);

            if (res.tokens && res.tokens.refresh_token) {
                console.log('userId', userId);
                console.log('Refresh token', res.tokens.refresh_token);
                const updateUser = await UserModel.updateOne(
                    {
                        _id: userId,
                    },
                    {
                        googleOauthRefreshToken: res.tokens.refresh_token,
                    }
                );

                if (updateUser && updateUser.nModified > 0) {
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

    @Field((type) => ZoomObject, { nullable: true })
    public async connectZoom(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('code', (type) => String)
        code: string
    ) {
        try {
            const b = Buffer.from(zoomClientId + ':' + zoomClientSecret);

            const zoomRes: any = await axios.post(
                `https://zoom.us/oauth/token?grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(
                    zoomRedirectUri
                )}`,
                undefined,
                {
                    headers: {
                        Authorization: `Basic ${b.toString('base64')}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );
            if (zoomRes.status !== 200) {
                return null;
            }

            const zoomData: any = zoomRes.data;
            // Retreive user details
            const zoomUserRes: any = await axios.get('https://api.zoom.us/v2/users/me', {
                headers: {
                    Authorization: `Bearer ${zoomData.access_token}`,
                },
            });

            const zoomUserData: any = zoomUserRes.data;
            const expiresOn = new Date();
            expiresOn.setSeconds(
                expiresOn.getSeconds() +
                    (Number.isNaN(Number(zoomUserData.expires_in)) ? 0 : Number(zoomUserData.expires_in))
            );

            const zoomInfo = {
                email: zoomUserData.email,
                accountId: zoomUserData.account_id,
                accessToken: zoomData.access_token,
                refreshToken: zoomData.refresh_token,
                expiresOn,
                accountType: zoomData.type,
            };

            // REVOKE ACCESS TO THIS ZOOM ACCOUNT FOR OTHER USERS WITH THIS EMAIL
            await UserModel.updateMany(
                {
                    'zoomInfo.email': zoomUserData.email,
                },
                {
                    zoomInfo: undefined,
                }
            );

            // SET ZOOM ACCOUNT FOR THIS USER
            await UserModel.updateOne(
                { _id: userId },
                {
                    zoomInfo,
                }
            );

            return {
                email: zoomUserData.email,
                accountId: zoomUserData.account_id,
            };
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    @Field((type) => Boolean)
    public async updateAnnotationsFromViewer(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('cueId', (type) => String)
        cueId: string,
        @Arg('annotations', (type) => String)
        annotations: string,
        @Arg('source', (type) => String)
        source: string
    ) {
        try {
            if (!cueId || !userId) return false;

            let mod: any = {};

            if (source === 'MY_NOTES') {
                mod = await CueModel.findOne({
                    _id: cueId,
                    createdBy: userId,
                });
            } else {
                mod = await ModificationsModel.findOne({ cueId, userId });
            }

            if (!mod) return false;

            if (source === 'UPDATE') {
                await ModificationsModel.updateOne(
                    {
                        cueId,
                        userId,
                    },
                    {
                        annotations,
                    }
                );
            } else if (source === 'VIEW_SUBMISSION' || source === 'FEEDBACK') {
                if (!mod.cue) return false;

                const currCueValue = mod.cue;

                const obj = JSON.parse(currCueValue);

                const currAttempt = obj.attempts[obj.attempts.length - 1];

                currAttempt.annotations = annotations;

                const allAttempts = [...obj.attempts];

                allAttempts[allAttempts.length - 1] = currAttempt;

                const updateCue = {
                    attempts: allAttempts,
                    submissionDraft: obj.submissionDraft,
                };

                await ModificationsModel.updateOne(
                    {
                        cueId,
                        userId,
                    },
                    {
                        cue: JSON.stringify(updateCue),
                    }
                );
            } else if (source === 'CREATE_SUBMISSION') {
                if (!mod.cue) return false;

                const currCueValue = mod.cue;

                const obj = JSON.parse(currCueValue);

                const currSubmissionDraft = JSON.parse(obj.submissionDraft);

                const updateSubmissionDraft = {
                    ...currSubmissionDraft,
                    annotations,
                };

                const updateCue = {
                    attempts: obj.attempts,
                    submissionDraft: JSON.stringify(updateSubmissionDraft),
                };

                await ModificationsModel.updateOne(
                    {
                        cueId,
                        userId,
                    },
                    {
                        cue: JSON.stringify(updateCue),
                    }
                );
            } else if (source === 'MY_NOTES') {
                const updateCue = await CueModel.updateOne(
                    {
                        _id: cueId,
                        createdBy: userId,
                    },
                    {
                        annotations,
                    }
                );

                console.log('Updated cue', updateCue);
            }

            return true;
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }

    // ADMIN USERS

    @Field((type) => String)
    public async newUserAdmin(
        @Arg('newUserInput', (type) => NewUserAdmin)
        newUserInput: NewUserAdmin
    ) {
        try {
            const {
                role,
                email,
                fullName,
                grade,
                section,
                avatar,
                sisId,
                schoolId,
                storePersonalInfo,
                dateOfBirth,
                expectedGradYear,
                phoneNumber,
                streetAddress,
                streetAddress2,
                city,
                state,
                country,
                zip,
                giveParentsAccess,
                parent1Name,
                parent1Email,
                parent2Name,
                parent2Email,
            } = newUserInput;

            const serverClient = StreamChat.getInstance(STREAM_CHAT_API_KEY, STREAM_CHAT_API_SECRET);

            function emailAccessToParent(parent: any, user: any, parentPassword: string, school: any) {}

            function emailAccessToStudent(user: any, school: any, isSSOEnabled: boolean, password?: string) {
                const emailService = new EmailService();

                if (!isSSOEnabled && password) {
                    emailService.newUserAddedPassword(user.fullName, user.email, password, school.name);
                } else if (isSSOEnabled) {
                    emailService.newUserAddedSSO(user.fullName, user.email, school.name);
                }
            }

            async function registerUserToStream(user: any, userSchoolId: string) {
                // REGISTER USER TO STREAM
                // IF USER IS PARENT THEN WE NEED TO STORE  USER ID +
                await serverClient.upsertUser({
                    id: user._id.toString(),
                    name: user.fullName,
                    image: user.avatar,
                    email: user.email,
                    cues_role: user.role,
                    cues_grade: user.role === 'student' ? user.grade : undefined,
                    cues_section: user.role === 'student' ? user.section : undefined,
                    schoolId: userSchoolId,
                    teams: [userSchoolId],
                });

                // Automatic expiration for chat user
                const token = serverClient.createToken(user._id.toString());

                await UserModel.updateOne(
                    {
                        _id: user._id,
                    },
                    {
                        streamToken: token,
                    }
                );
            }

            // BASIC VALIDATION
            const checkExistingUser = await UserModel.findOne({
                email,
            });

            if (checkExistingUser) {
                return 'EMAIL_ALREADY_IN_USE';
            }

            if (sisId) {
                const checkExistingSISId = await UserModel.findOne({
                    sisId,
                    schoolId,
                });

                if (checkExistingSISId) {
                    return 'DUPLICATE_SIS_ID';
                }
            }

            let storeSisId = sisId;

            // GENERATE NEW SIS ID IF NOT AVAILABLE
            if (!sisId) {
                storeSisId = customId({
                    name: fullName,
                    email,
                });
            }

            let personalInfo = {
                dateOfBirth,
                expectedGradYear,
                phoneNumber,
                streetAddress,
                streetAddress2,
                city,
                state,
                country,
                zip,
            };

            let parent1;
            let parent2;
            let parent1Password;
            let parent2Password;

            // PARENT ACCESS VALIDATION
            if (giveParentsAccess) {
                // FIRST CHECK IF PARENT EMAILS ARE VALID
                let fetchParent1;
                let fetchParent2;

                if (parent1Email && parent1Name) {
                    // check if parent1Email is valid
                    fetchParent1 = await UserModel.findOne({
                        email: parent1Email,
                    });

                    if (fetchParent1 && fetchParent1.role && fetchParent1.role !== 'parent') {
                        return 'PARENT_1_EMAIL_INVALID';
                    }
                }

                if (parent2Email && parent2Name) {
                    // check if parent2Email is valid
                    fetchParent2 = await UserModel.findOne({
                        email: parent2Email,
                    });

                    if (fetchParent2 && fetchParent2.role && fetchParent2.role !== 'parent') {
                        return 'PARENT_2_EMAIL_INVALID';
                    }
                }

                if (parent1Email && parent1Name) {
                    if (fetchParent1) {
                        parent1 = {
                            _id: fetchParent1._id,
                            name: fetchParent1.fullName,
                            email: fetchParent1.email,
                        };
                    } else {
                        // GENERATE PASSWORD FOR PARENT1
                        const username =
                            parent1Email.split('@')[0] + Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();
                        const password = username + '@123';
                        const hash = await hashPassword(password);
                        parent1Password = password;

                        // create new parent
                        const newParent = await UserModel.create({
                            notificationId: 'NOT_SET',
                            fullName: parent1Name,
                            email: parent1Email.toLowerCase(),
                            role: 'parent',
                            displayName: parent1Name.toLowerCase(),
                            password: hash,
                        });

                        if (newParent) {
                            parent1 = {
                                _id: newParent._id,
                                name: parent1Name,
                                email: parent1Email,
                            };
                        }
                    }
                }

                if (parent2Email && parent2Name) {
                    if (fetchParent2) {
                        parent2 = {
                            _id: fetchParent2._id,
                            name: fetchParent2.fullName,
                            email: fetchParent2.email,
                        };
                    } else {
                        // GENERATE PASSWORD FOR PARENT1
                        const username =
                            parent2Email.split('@')[0] + Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();
                        const password = username + '@123';
                        const hash = await hashPassword(password);
                        parent2Password = password;

                        // create new parent
                        const newParent = await UserModel.create({
                            notificationId: 'NOT_SET',
                            fullName: parent2Name,
                            email: parent2Email.toLowerCase(),
                            role: 'parent',
                            displayName: parent2Name.toLowerCase(),
                            password: hash,
                        });

                        if (newParent) {
                            parent2 = {
                                _id: newParent._id,
                                name: parent2Name,
                                email: parent2Email,
                            };
                        }
                    }
                }
            }

            const username = email.split('@')[0] + Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();
            const password = username + '@123';
            const hash = await hashPassword(password);

            const createNewUser = await UserModel.create({
                notificationId: 'NOT_SET',
                email: email.toLowerCase(),
                fullName,
                displayName: fullName.toLowerCase(),
                role,
                grade,
                section,
                avatar,
                schoolId,
                sisId: storeSisId,
                personalInfo: storePersonalInfo ? personalInfo : undefined,
                parent1: role === 'student' && parent1 ? parent1 : undefined,
                parent2: role === 'student' && parent2 ? parent2 : undefined,
                password: hash,
            });

            if (!createNewUser) {
                return 'SOMETHING_WENT_WRONG';
            }

            registerUserToStream(createNewUser, schoolId);

            let isSSOSchool = false;

            const fetchSchool = await SchoolsModel.findOne({
                _id: schoolId,
            });

            if (!fetchSchool) return;

            const school = fetchSchool.toObject();
            const user = createNewUser.toObject();

            if (fetchSchool.ssoEnabled && fetchSchool.workosConnection) {
                isSSOSchool = true;
            }

            emailAccessToStudent(user, school, isSSOSchool, !isSSOSchool ? password : undefined);

            if (parent1 && parent1._id) {
                await UserModel.updateOne(
                    {
                        _id: parent1._id,
                    },
                    {
                        $addToSet: { parentSchoolIds: schoolId },
                    }
                );
            }

            if (parent2 && parent2._id) {
                await UserModel.updateOne(
                    {
                        _id: parent2._id,
                    },
                    {
                        $addToSet: { parentSchoolIds: schoolId },
                    }
                );
            }

            // if (giveParentsAccess && parent1 && parent1Password) {
            //     emailAccessToParent(parent1, user, parent1Password, school);
            // }

            // if (giveParentsAccess && parent2 && parent2Password) {
            //     emailAccessToParent(parent2, user, parent2Password, school);
            // }

            return 'SUCCESS';
        } catch (e) {
            console.log('error', e);
            return 'SOMETHING_WENT_WRONG';
        }
    }

    // ENROLL IMPORTED USERS
    @Field((type) => AddImportedUsersResponse, {
        description: 'Add imported Users Admin',
    })
    public async createImportedUsers(
        @Arg('importedUsers', (type) => [NewUserAdmin])
        importedUsers: NewUserAdmin[]
    ) {
        try {
            const serverClient = StreamChat.getInstance(STREAM_CHAT_API_KEY, STREAM_CHAT_API_SECRET);

            function emailAccessToParent(parent: any, user: any, parentPassword: string, school: any) {}

            function emailAccessToStudent(user: any, school: any, isSSOEnabled: boolean, password?: string) {
                const emailService = new EmailService();

                if (!isSSOEnabled && password) {
                    emailService.newUserAddedPassword(user.fullName, user.email, password, school.name);
                } else if (isSSOEnabled) {
                    emailService.newUserAddedSSO(user.fullName, user.email, school.name);
                }
            }

            async function registerUserToStream(user: any, userSchoolId: string) {
                // REGISTER USER TO STREAM
                // IF USER IS PARENT THEN WE NEED TO STORE  USER ID +
                await serverClient.upsertUser({
                    id: user._id.toString(),
                    name: user.fullName,
                    image: user.avatar,
                    email: user.email,
                    cues_role: user.role,
                    cues_grade: user.role === 'student' ? user.grade : undefined,
                    cues_section: user.role === 'student' ? user.section : undefined,
                    schoolId: userSchoolId,
                    teams: [userSchoolId],
                });

                // Automatic expiration for chat user
                const token = serverClient.createToken(user._id.toString());

                await UserModel.updateOne(
                    {
                        _id: user._id,
                    },
                    {
                        streamToken: token,
                    }
                );
            }

            let success: string[] = [];
            let failedToAdd: string[] = [];
            let errors: string[] = [];
            let fetchSchool: any;

            for (let i = 0; i < importedUsers.length; i++) {
                const newUserInput = importedUsers[i];

                const {
                    role,
                    email,
                    fullName,
                    grade,
                    section,
                    avatar,
                    sisId,
                    schoolId,
                    storePersonalInfo,
                    dateOfBirth,
                    expectedGradYear,
                    phoneNumber,
                    streetAddress,
                    city,
                    state,
                    country,
                    zip,
                    giveParentsAccess,
                    parent1Name,
                    parent1Email,
                    parent2Name,
                    parent2Email,
                } = newUserInput;

                // BASIC VALIDATION
                const checkExistingUser = await UserModel.findOne({
                    email,
                });

                if (checkExistingUser) {
                    failedToAdd.push(i.toString());
                    errors.push('EMAIL_ALREADY_EXISTS');
                    continue;
                }

                if (sisId) {
                    const checkExistingSISId = await UserModel.findOne({
                        sisId,
                    });

                    if (checkExistingSISId) {
                        failedToAdd.push(i.toString());
                        errors.push('DUPLICATE_SIS_ID');
                        continue;
                    }
                }

                let storeSisId = sisId;

                // GENERATE NEW SIS ID IF NOT AVAILABLE
                if (!sisId) {
                    storeSisId = customId({
                        name: fullName,
                        email,
                    });
                }

                let personalInfo = {
                    dateOfBirth,
                    expectedGradYear,
                    phoneNumber,
                    streetAddress,
                    city,
                    state,
                    country,
                    zip,
                };

                let parent1;
                let parent2;
                let parent1Password;
                let parent2Password;

                // PARENT ACCESS VALIDATION
                if (giveParentsAccess) {
                    // FIRST CHECK IF PARENT EMAILS ARE VALID
                    let fetchParent1;
                    let fetchParent2;

                    if (parent1Email && parent1Name) {
                        // check if parent1Email is valid
                        fetchParent1 = await UserModel.findOne({
                            email: parent1Email,
                        });

                        if (fetchParent1 && fetchParent1.role && fetchParent1.role !== 'parent') {
                            failedToAdd.push(i.toString());
                            errors.push('PARENT_1_EMAIL_INVALID');
                            continue;
                        }
                    }

                    if (parent2Email && parent2Name) {
                        // check if parent2Email is valid
                        fetchParent2 = await UserModel.findOne({
                            email: parent2Email,
                        });

                        if (fetchParent2 && fetchParent2.role && fetchParent2.role !== 'parent') {
                            failedToAdd.push(i.toString());
                            errors.push('PARENT_2_EMAIL_INVALID');
                            continue;
                        }
                    }

                    if (parent1Email && parent1Name) {
                        if (fetchParent1) {
                            parent1 = {
                                _id: fetchParent1._id,
                                name: fetchParent1.fullName,
                                email: fetchParent1.email,
                            };
                        } else {
                            // GENERATE PASSWORD FOR PARENT1
                            const username =
                                parent1Email.split('@')[0] +
                                Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();
                            const password = username + '@123';
                            const hash = await hashPassword(password);
                            parent1Password = password;

                            // create new parent
                            const newParent = await UserModel.create({
                                notificationId: 'NOT_SET',
                                fullName: parent1Name,
                                email: parent1Email.toLowerCase(),
                                role: 'parent',
                                displayName: parent1Name.toLowerCase(),
                                password: hash,
                            });

                            if (newParent) {
                                parent1 = {
                                    _id: newParent._id,
                                    name: parent1Name,
                                    email: parent1Email,
                                };
                            }
                        }
                    }

                    if (parent2Email && parent2Name) {
                        if (fetchParent2) {
                            parent2 = {
                                _id: fetchParent2._id,
                                name: fetchParent2.fullName,
                                email: fetchParent2.email,
                            };
                        } else {
                            // GENERATE PASSWORD FOR PARENT1
                            const username =
                                parent2Email.split('@')[0] +
                                Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();
                            const password = username + '@123';
                            const hash = await hashPassword(password);
                            parent2Password = password;

                            // create new parent
                            const newParent = await UserModel.create({
                                notificationId: 'NOT_SET',
                                fullName: parent2Name,
                                email: parent2Email.toLowerCase(),
                                role: 'parent',
                                displayName: parent2Name.toLowerCase(),
                                password: hash,
                            });

                            if (newParent) {
                                parent2 = {
                                    _id: newParent._id,
                                    name: parent2Name,
                                    email: parent2Email,
                                };
                            }
                        }
                    }
                }

                const username = email.split('@')[0] + Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();
                const password = username + '@123';
                const hash = await hashPassword(password);

                const createNewUser = await UserModel.create({
                    notificationId: 'NOT_SET',
                    email: email.toLowerCase(),
                    fullName,
                    displayName: fullName.toLowerCase(),
                    role,
                    grade,
                    section,
                    avatar,
                    schoolId,
                    sisId: storeSisId,
                    personalInfo: storePersonalInfo ? personalInfo : undefined,
                    parent1: role === 'student' && parent1 ? parent1 : undefined,
                    parent2: role === 'student' && parent2 ? parent2 : undefined,
                    password: hash,
                });

                if (!createNewUser) {
                    failedToAdd.push(i.toString());
                    errors.push('SOMETHING_WENT_WRONG');
                    continue;
                }

                registerUserToStream(createNewUser, schoolId);

                let isSSOSchool = false;

                if (!fetchSchool) {
                    fetchSchool = await SchoolsModel.findOne({
                        _id: schoolId,
                    });
                }

                if (parent1 && parent1._id) {
                    await UserModel.updateOne(
                        {
                            _id: parent1._id,
                        },
                        {
                            $addToSet: { parentSchoolIds: schoolId },
                        }
                    );
                }

                if (parent2 && parent2._id) {
                    await UserModel.updateOne(
                        {
                            _id: parent2._id,
                        },
                        {
                            $addToSet: { parentSchoolIds: schoolId },
                        }
                    );
                }

                const school = fetchSchool.toObject();
                const user = createNewUser.toObject();

                if (fetchSchool.ssoEnabled && fetchSchool.workosConnection) {
                    isSSOSchool = true;
                }

                emailAccessToStudent(user, school, isSSOSchool, !isSSOSchool ? password : undefined);

                // if (giveParentsAccess && parent1 && parent1Password) {
                //     emailAccessToParent(parent1, user, parent1Password, school);
                // }

                // if (giveParentsAccess && parent2 && parent2Password) {
                //     emailAccessToParent(parent2, user, parent2Password, school);
                // }

                success.push(i.toString());
            }

            return {
                success,
                failedToAdd,
                errors,
            };
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }

    @Field((type) => String)
    public async editUserAdmin(
        @Arg('editUserInput', (type) => EditUserAdmin)
        editUserInput: EditUserAdmin
    ) {
        try {
            const {
                _id,
                email,
                fullName,
                grade,
                section,
                avatar,
                sisId,
                dateOfBirth,
                expectedGradYear,
                phoneNumber,
                streetAddress,
                streetAddress2,
                city,
                state,
                country,
                zip,
                parent1Modified,
                parent1Name,
                parent1Email,
                parent2Modified,
                parent2Name,
                parent2Email,
            } = editUserInput;

            const personalInfo = {
                dateOfBirth,
                expectedGradYear,
                phoneNumber,
                streetAddress,
                streetAddress2,
                city,
                state,
                country,
                zip,
            };

            // BASIC VALIDATION
            const checkExistingUser = await UserModel.findOne({
                email,
            });

            const fetchUser = await UserModel.findById(_id);

            if (!fetchUser) return 'SOMETHING_WENT_WRONG';

            const user = fetchUser.toObject();

            if (email !== user.email && checkExistingUser) {
                return 'EMAIL_ALREADY_IN_USE';
            }

            if (sisId !== user.sisId) {
                const checkSisIdInUse = await UserModel.findOne({
                    sisId,
                    schoolId: user.schoolId,
                });

                if (!checkSisIdInUse) {
                    return 'DUPLICATE_SIS_ID';
                }
            }

            let updateParent1: any;
            let parent1Password: any;

            let updateParent2: any;
            let parent2Password: any;

            if (parent1Modified && parent1Email && parent1Name) {
                // check if parent1Email is valid
                const fetchParent1 = await UserModel.findOne({
                    email: parent1Email,
                });

                if (fetchParent1 && fetchParent1.role && fetchParent1.role !== 'parent') {
                    return 'PARENT_1_EMAIL_INVALID';
                } else if (fetchParent1) {
                    updateParent1 = {
                        _id: fetchParent1._id,
                        name: fetchParent1.fullName,
                        email: fetchParent1.email,
                    };
                } else {
                    // GENERATE PASSWORD FOR PARENT1
                    const username =
                        parent1Email.split('@')[0] + Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();
                    const password = username + '@123';
                    const hash = await hashPassword(password);
                    parent1Password = password;

                    // create new parent
                    const newParent = await UserModel.create({
                        notificationId: 'NOT_SET',
                        fullName: parent1Name,
                        email: parent1Email,
                        role: 'parent',
                        displayName: parent1Name.toLowerCase(),
                        password: hash,
                    });

                    if (newParent) {
                        updateParent1 = {
                            _id: newParent._id,
                            name: parent1Name,
                            email: parent1Email,
                        };
                    }
                }
            } else if (parent1Modified && (!parent1Email || !parent1Name)) {
                updateParent1 = undefined;
            } else {
                updateParent1 = user.parent1;
            }

            if (parent2Modified && parent2Email && parent2Name) {
                // check if parent2Email is valid
                const fetchParent2 = await UserModel.findOne({
                    email: parent2Email,
                });

                if (fetchParent2 && fetchParent2.role && fetchParent2.role !== 'parent') {
                    return 'PARENT_1_EMAIL_INVALID';
                } else if (fetchParent2) {
                    updateParent2 = {
                        _id: fetchParent2._id,
                        name: fetchParent2.fullName,
                        email: fetchParent2.email,
                    };
                } else {
                    // GENERATE PASSWORD FOR PARENT2
                    const username =
                        parent2Email.split('@')[0] + Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();
                    const password = username + '@123';
                    const hash = await hashPassword(password);
                    parent2Password = password;

                    // create new parent
                    const newParent = await UserModel.create({
                        notificationId: 'NOT_SET',
                        fullName: parent2Name,
                        email: parent2Email,
                        role: 'parent',
                        displayName: parent2Name.toLowerCase(),
                        password: hash,
                    });

                    if (newParent) {
                        updateParent2 = {
                            _id: newParent._id,
                            name: parent2Name,
                            email: parent2Email,
                        };
                    }
                }
            } else if (parent2Modified && (!parent2Email || !parent2Name)) {
                updateParent2 = undefined;
            } else {
                updateParent2 = user.parent2;
            }

            const updateUser = await UserModel.updateOne(
                {
                    _id,
                },
                {
                    email,
                    fullName,
                    grade,
                    section,
                    avatar,
                    sisId,
                    personalInfo,
                    parent1: updateParent1,
                    parent2: updateParent2,
                }
            );

            const serverClient = StreamChat.getInstance(STREAM_CHAT_API_KEY, STREAM_CHAT_API_SECRET);

            if (updateUser) {
                // UPDATE STREAM PROFILE FOR USER
                serverClient.partialUpdateUser({
                    id: _id,
                    set: {
                        name: fullName,
                        image: avatar,
                        email: email,
                        cues_grade: user.role === 'student' ? grade : undefined,
                        cues_section: user.role === 'student' ? section : undefined,
                    },
                });
            }

            const fetchSchool = await SchoolsModel.findOne({
                _id: user.schoolId,
            });

            if (!fetchSchool) return;

            const school = fetchSchool.toObject();

            // if (parent1Modified && parent1Name && parent1Password) {
            //     emailAccessToParent(updateParent1, user, parent1Password, school);
            // }

            // if (parent2Modified && parent1Name && parent1Password) {
            //     emailAccessToParent(updateParent1, user, parent1Password, school);
            // }

            if (updateUser.nModified > 0) {
                return 'SUCCESS';
            } else {
                return 'SOMETHING_WENT_WRONG';
            }
        } catch (e) {
            console.log('Error', e);
            return 'SOMETHING_WENT_WRONG';
        }
    }

    @Field((type) => String)
    public async uploadFileFromDrive(
        @Arg('userId', (type) => String)
        userId: String,
        @Arg('fileId', (type) => String)
        fileId: String
    ) {
        try {
            const fetchUser = await UserModel.findById(userId);

            if (!fetchUser || !fetchUser.googleOauthRefreshToken) return '';

            const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

            oAuth2Client.setCredentials({ refresh_token: fetchUser.googleOauthRefreshToken });

            const drive = google.drive({
                version: 'v3',
                auth: oAuth2Client,
            });

            const file = await drive.files.get({ fileId, alt: 'media' });

            console.log('File', file);

            if (!file || !file.status) {
                return '';
            }

            // const exportLink = file.data.exportLinks['application/pdf'];

            AWS.config.update({
                accessKeyId: 'AKIAJS2WW55SPDVYG2GQ',
                secretAccessKey: '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',
            });

            // const options = {
            //     uri: exportLink,
            //     encoding: null,
            // };

            // const body = await request(options);

            const s3 = new AWS.S3();

            const link = await s3.upload(
                {
                    Bucket: 'cues-files',
                    Key: 'media/' + userId + '/' + 'pdf/' + encodeURIComponent(file.data.title),
                    Body: file.data,
                    ContentType: 'application/pdf',
                },
                (err: any, data: any) => {
                    // handle error
                    if (err) {
                        console.log(err);
                        return '';
                    }
                    // success
                    return data.Location;
                }
            );

            console.log('Link', link);

            return link;
        } catch (e) {
            console.log('error', e);
            return '';
        }
    }

    // ADMIN USERS
    @Field((type) => String)
    public async newAdmin(
        @Arg('adminInput', (type) => NewAdminInputObject)
        adminInput: NewAdminInputObject
    ) {
        function emailAccessToAdmin(user: any, school: any, isSSOEnabled: boolean, password?: string) {
            const emailService = new EmailService();

            if (!isSSOEnabled && password) {
                emailService.newAdminAddedPassword(user.fullName, user.email, password, school.name);
            } else if (isSSOEnabled) {
                emailService.newAdminAddedSSO(user.fullName, user.email, school.name);
            }
        }

        const { email, fullName, avatar, schoolId, role, permissions, phoneNumber, jobTitle } = adminInput;

        // BASIC VALIDATION
        const checkExistingUser = await UserModel.findOne({
            email,
        });

        if (checkExistingUser) {
            return 'EMAIL_ALREADY_IN_USE';
        }

        const username = email.split('@')[0] + Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();

        const password = username + '@123';

        const hash = await hashPassword(password);

        const createAdminUser = await UserModel.create({
            email,
            fullName,
            displayName: fullName.toLowerCase(),
            avatar,
            schoolId,
            role: 'admin',
            password: hash,
            adminInfo: {
                role,
                contactNumber: phoneNumber,
                permissions,
                jobTitle,
            },
            notificationId: 'NOT_SET',
        });

        if (!createAdminUser) {
            return 'SOMETHING_WENT_WRONG';
        }

        // Add user to
        const serverClient = StreamChat.getInstance(STREAM_CHAT_API_KEY, STREAM_CHAT_API_SECRET);

        // UPSERT USER
        await serverClient.upsertUser({
            id: createAdminUser._id.toString(),
            name: createAdminUser.fullName,
            image: createAdminUser.avatar,
            email: createAdminUser.email,
            cues_role: createAdminUser.role,
            schoolId,
            teams: [schoolId],
        });

        // Automatic expiration for chat user
        const token = serverClient.createToken(createAdminUser._id.toString());

        await UserModel.updateOne(
            {
                _id: createAdminUser._id,
            },
            {
                streamToken: token,
            }
        );

        let isSSOSchool = false;

        const fetchSchool = await SchoolsModel.findOne({
            _id: schoolId,
        });

        if (!fetchSchool) return;

        const school = fetchSchool.toObject();
        const user = createAdminUser.toObject();

        if (fetchSchool.ssoEnabled && fetchSchool.workosConnection) {
            isSSOSchool = true;
        }

        emailAccessToAdmin(user, school, isSSOSchool, !isSSOSchool ? password : undefined);

        return 'SUCCESS';
    }

    @Field((type) => String)
    public async editAdmin(
        @Arg('adminInput', (type) => EditAdminInputObject)
        adminInput: EditAdminInputObject
    ) {
        try {
            const { _id, email, fullName, avatar, role, permissions, phoneNumber, jobTitle } = adminInput;

            // BASIC VALIDATION
            const checkExistingUser = await UserModel.findOne({
                email,
            });

            const fetchUser = await UserModel.findById(_id);

            if (!fetchUser) return 'SOMETHING_WENT_WRONG';

            const user = fetchUser.toObject();

            if (email !== user.email && checkExistingUser) {
                return 'EMAIL_ALREADY_IN_USE';
            }

            const updateAdmin = await UserModel.updateOne(
                {
                    _id,
                },
                {
                    email,
                    fullName,
                    avatar,
                    adminInfo: {
                        jobTitle,
                        role,
                        permissions,
                        contactNumber: phoneNumber,
                    },
                }
            );

            if (updateAdmin.nModified <= 0) {
                return 'SOMETHING_WENT_WRONG';
            }

            // Add user to
            const serverClient = StreamChat.getInstance(STREAM_CHAT_API_KEY, STREAM_CHAT_API_SECRET);

            if (updateAdmin) {
                // UPDATE STREAM PROFILE FOR USER
                serverClient.partialUpdateUser({
                    id: _id,
                    set: {
                        name: fullName,
                        image: avatar,
                        email: email,
                        role: 'admin',
                    },
                });
            }

            return 'SUCCESS';
        } catch (e) {
            console.log('Error', e);
            return 'SOMETHING_WENT_WRONG';
        }
    }
}
