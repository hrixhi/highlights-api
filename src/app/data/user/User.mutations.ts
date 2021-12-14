import { hashPassword, verifyPassword } from "@app/data/methods";
import { UserModel } from "@app/data/user/mongo/User.model";
import { EmailService } from "../../../emailservice/Postmark";
import { Arg, Field, ObjectType } from "type-graphql";
import { ChannelModel } from "../channel/mongo/Channel.model";
import { CueModel } from "../cue/mongo/Cue.model";
import { ModificationsModel } from "../modification/mongo/Modification.model";
import { SubscriptionModel } from "../subscription/mongo/Subscription.model";
import { UserObject, ZoomObject } from "./types/User.type";
import { SchoolsModel } from "../school/mongo/School.model";
import { ThreadModel } from "../thread/mongo/Thread.model";
import { ThreadStatusModel } from "../thread-status/mongo/thread-status.model";
import axios from 'axios'
import { createJWTToken } from "../../../helpers/auth";
import { AuthResponseObject } from "./types/AuthResponse.type";
import { zoomClientId, zoomClientSecret, zoomRedirectUri } from '../../../helpers/zoomCredentials'

/**
 * User Mutation Endpoints
 */
@ObjectType()
export class UserMutationResolver {
	@Field((type) => UserObject, {
		description: "Used when you want to create user.",
		nullable: true,
	})
	public async create(
		@Arg("fullName", (type) => String)
		fullName: string,
		@Arg("displayName", (type) => String)
		displayName: string,
		@Arg("notificationId", (type) => String)
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
		description: "Used when you want to update a user.",
		nullable: true,
	})
	public async update(
		@Arg("fullName", (type) => String)
		fullName: string,
		@Arg("displayName", (type) => String)
		displayName: string,
		@Arg("userId", (type) => String)
		userId: string,
		@Arg("avatar", (type) => String, { nullable: true })
		avatar?: string
	) {
		try {
			await UserModel.updateOne(
				{ _id: userId },
				{
					fullName,
					displayName,
					avatar: avatar ? avatar : undefined
				}
			);
			return true;
		} catch (e) {
			console.log(e);
			return false;
		}
	}

	@Field((type) => Boolean, {
		description: "false means entered password is incorrect.",
		nullable: true,
	})
	public async updatePassword(
		@Arg("userId", (type) => String)
		userId: string,
		@Arg("currentPassword", (type) => String)
		currentPassword: string,
		@Arg("newPassword", (type) => String)
		newPassword: string
	) {
		try {
			const u = await UserModel.findById(userId);
			if (u) {
				const user: any = u.toObject();
				const passwordCorrect = await verifyPassword(
					currentPassword,
					user.password
				);
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
		description:
			"Updates the notification Id for a user that was not set up on native devices.",
		nullable: true,
	})
	public async updateNotificationId(
		@Arg("userId", (type) => String)
		userId: string,
		@Arg("notificationId", (type) => String)
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
		description: "Resets password using email.",
		nullable: true,
	})
	public async resetPassword(
		@Arg("email", (type) => String)
		email: string
	) {
		try {
			const u = await UserModel.findOne({ email });
			if (u) {
				const newPassword = (Math.random() + Math.random())
					.toString(36)
					.substring(7);
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
		@Arg("fullName", (type) => String)
		fullName: string,
		@Arg("email", (type) => String)
		email: string,
		@Arg("password", (type) => String, { nullable: true })
		password?: string,
	) {
		try {
			// First lookup document with provided email
			const existingUser = await UserModel.findOne({
				email,
			});

			if (existingUser !== null) {
				return "An account already exists. Try Signing in.";
			}

			if (!password) return "Invalid password. Try again."

			const hash = await hashPassword(password);

			await UserModel.create({
				email,
				fullName,
				displayName: fullName.toLowerCase(),
				notificationId: 'NOT_SET',
				password: hash,
			})
			
			return "SUCCESS";
		} catch (e) {
			console.log(e);
			return "Something went wrong. Try again.";
		}
	}

	@Field((type) => AuthResponseObject)
	public async authWithProvider(
		@Arg("fullName", (type) => String)
		fullName: string,
		@Arg("email", (type) => String)
		email: string,
		@Arg("provider", (type) => String)
		provider: string,
		@Arg("avatar", (type) => String, { nullable: true })
		avatar: string,
	) {
		try {
			// First lookup document with provided email
			const existingUser = await UserModel.findOne({
				email,
			});

			if (existingUser) {

				await UserModel.updateOne({ _id: existingUser._id }, { lastLoginAt: new Date() })

				const token = createJWTToken(existingUser._id)

				return {
					user: existingUser,
					error: "",
					token,
				};

			} else {

				const newUser = await UserModel.create({
					email,
					fullName,
					displayName: fullName.toLowerCase(),
					notificationId: 'NOT_SET',
					authProvider: provider,
					avatar
				})

				const token = createJWTToken(newUser._id)

				return {
					user: newUser,
					error: "",
					token,
				};

			}


		} catch (e) {
			console.log(e);
			return {
				user: null,
				error: "Something went wrong. Try again.",
				token: "",
			};
		}
	}

	@Field((type) => Boolean)
	public async saveConfigToCloud(
		@Arg("sleepFrom", (type) => String)
		sleepFrom: string,
		@Arg("sleepTo", (type) => String)
		sleepTo: string,
		@Arg("randomShuffleFrequency", (type) => String)
		randomShuffleFrequency: string,
		@Arg("userId", (type) => String)
		userId: string,
		@Arg("currentDraft", { nullable: true })
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

	@Field((type) => String)
	public async addUsersToOrganisation(
		@Arg("emails", (type) => [String])
		emails: string[],
		@Arg("schoolId", (type) => String)
		schoolId: string,
		@Arg("role", (type) => String)
		role: string,
		@Arg("grade", (type) => String)
		grade: string,
		@Arg("section", (type) => String)
		section: string
	) {
		try {
			const from = new Date();
			from.setHours(23, 0, 0);

			const to = new Date();
			to.setHours(7, 0, 0);

			const notificationId = "NOT_SET";
			let flagEmailUserExist = false;
			let emailExists = [];
			for (const email of emails) {
				const user = await UserModel.findOne({ email });
				if (user) {
					emailExists.push(email);
					flagEmailUserExist = true;
				}
			}

			if (flagEmailUserExist) {
				return (emailExists.length > 1 ? "Users with emails " : "User with email ") + emailExists.join(", ") + " already " + (emailExists.length > 1 ? "exist." : "exists.");
			} else {
				for (const email of emails) {
					const username =
						email.split("@")[0] +
						Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();
					const fullName = username;
					const displayName = username;
					const password = username + "@123";
					const dupPassword = password;

					const hash = await hashPassword(password);
					const newUser = await UserModel.create({
						schoolId,
						email,
						fullName,
						displayName,
						password: hash,
						notificationId,
						randomShuffleFrequency: "1-D",
						sleepFrom: from,
						sleepTo: to,
						currentDraft: "",
						role,
						grade: role === "instructor" || grade === "-" ? undefined : grade,
						section:
							role === "instructor" || section === "-" ? undefined : section,
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
					// send email
					const emailService = new EmailService();
					const org: any = await SchoolsModel.findById(schoolId);
					emailService.newAccountAddedToOrgConfirm(
						email,
						dupPassword,
						org.name
					);

					
				}
				
				return `${emails.length} users added to organization`;
			}
		} catch (e) {
			return "Error: Somthing went wrong";
		}
	}

	@Field((type) => Boolean)
	public async deleteUsersFromOrganisation(
		@Arg("emails", (type) => [String])
		emails: string[],
		@Arg("schoolId", (type) => String)
		schoolId: string
	) {
		try {
			emails.map(async (email) => {
				const user = await UserModel.findOne({ email, schoolId });
				if (user) {
					// remove school from user
					await UserModel.updateOne(
						{ _id: user._id },
						{
							schoolId: undefined,
							role: undefined,
							grade: undefined,
							section: undefined,
						}
					);
					// remove school subscriptions
				}
			});
			return true;
		} catch (e) {
			console.log(e);
			return false;
		}
	}

	@Field((type) => Boolean)
	public async deleteById(
		@Arg("ids", (type) => [String])
		ids: string[],
		@Arg("schoolId", (type) => String)
		schoolId: string
	) {
		try {
			await UserModel.updateMany(
				{
					schoolId,
					_id: { $in: ids },
				},
				{
					deletedAt: new Date(),
					notificationId: 'NOT_SET'
				}
			);

			for (let i = 0; i < ids.length; i++) {
				const id = ids[i];

				// Fetch user first
				const user = await UserModel.findOne({ _id: id, schoolId })

				if (!user) return;

				// Unsubscriber user from all the channels
				await SubscriptionModel.updateMany({
					userId: user._id,
					keepContent: { $exists: false }
				}, {
					unsubscribedAt: new Date(),
					keepContent: true	
				})
				
			}

			return true;
		} catch (e) {
			console.log(e);
			return false;
		}
	}

	@Field((type) => Boolean)
	public async changeInactiveStatus(
		@Arg("inactive", (type) => Boolean)
		inactive: boolean,
		@Arg("userId", (type) => String)
		userId: string
	) {
		try {
			// If making inactive then clear the notification id so that no new notifications are sent
			if (inactive) {
				await UserModel.updateOne({ _id: userId }, { inactive, notificationId: 'NOT_SET' });
			} else {
				await UserModel.updateOne({ _id: userId }, { inactive });
			}
			
			return true;
		} catch (e) {
			console.log(e);
			return false;
		}
	}

	@Field((type) => String, {
		description: "Used when you want to remove user.",
	})
	public async deleteByEmail(
		@Arg("emails", (type) => [String])
		emails: string[],
		@Arg("schoolId", (type) => String)
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
						notificationId: 'NOT_SET'
					}
				);
				for (let i = 0; i < emails.length; i++) {
					const email = emails[i];

					// Fetch user first
					const user = await UserModel.findOne({ email, schoolId });

					if (!user) return;

					// Unsubscriber user from all the channels
					await SubscriptionModel.updateMany({
						userId: user._id,
						keepContent: { $exists: false }
					}, {
						unsubscribedAt: new Date(),
						keepContent: true	
					})
					
				}

				return (emails.length > 1 ? "Users" : "User") +  " removed successfully."
				
			} else {
				if (emailNotExist.length > 0) {
					return (emailNotExist.length > 1 ? "Emails " : "Email " ) + emailNotExist.join(", ") + (emailNotExist.length > 1 ? " don't exist." : " doesn't exist." );
				} else {
					return "Email not exists.";
				}
			}

			//return true;
		} catch (e) {
			console.log(e);
			return false;
		}
	}

	@Field((type) => Boolean)
	public async updateOrgUser(
		@Arg("emails", (type) => [String])
		emails: string[],
		@Arg("role", (type) => String)
		role: string,
		@Arg("grade", (type) => String)
		grade: string,
		@Arg("section", (type) => String)
		section: string
	) {
		try {
			emails.map(async (email) => {
				const user = await UserModel.findOne({ email });
				if (user) {
					await UserModel.updateOne(
						{ _id: user._id },
						{
							role,
							grade: role === "instructor" || grade === "-" ? undefined : grade,
							section:
								role === "instructor" || section === "-" ? undefined : section,
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
		@Arg("emails", (type) => [String])
		emails: string[],
		@Arg("channelId", (type) => String)
		channelId: string
	) {
		try {
			const from = new Date();
			from.setHours(23, 0, 0);
			const to = new Date();
			to.setHours(7, 0, 0);
			const notificationId = "NOT_SET";

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
						if (
							user.schoolId &&
							user.schoolId.toString().trim() === schoolId.toString().trim()
						) {
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
									duplicate.cue = "";
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
							emailService.inviteByEmail(
								user.email ? user.email : "",
								channel.name
							);
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
								duplicate.cue = "";
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
						emailService.inviteByEmail(
							user.email ? user.email : "",
							channel.name
						);
					}
				} else {
					if (!schoolId) {
						// create user
						const username =
							email.split("@")[0] +
							Math.floor(Math.random() * (999 - 100 + 1) + 100).toString();
						const fullName = username;
						const displayName = username;
						const password = username + "@123";
						const hash = await hashPassword(password);
						const newUser = await UserModel.create({
							email,
							fullName,
							displayName,
							password: hash,
							notificationId,
							randomShuffleFrequency: "1-D",
							sleepFrom: from,
							sleepTo: to,
							currentDraft: "",
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
								duplicate.cue = "";
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

	@Field(type => Boolean)
	public async removeZoom(
		@Arg("userId", (type) => String)
		userId: string,
	) {
			
		try {
			let accessToken = ''
			const u: any = await UserModel.findById(userId);
			if (u) {
				const user = u.toObject();
	
				if (!user.zoomInfo) {
					return false;
				} else {
					accessToken = user.zoomInfo.accessToken
				}
	
				const b = Buffer.from(zoomClientId + ":" + zoomClientSecret);
	
				const date = new Date()
				const expiresOn = new Date(user.zoomInfo.expiresOn)
	
				if (expiresOn <= date) {
					// refresh access token
	
					const zoomRes: any = await axios.post(
						`https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${user.zoomInfo.refreshToken}`, undefined, {
						headers: {
							Authorization: `Basic ${b.toString("base64")}`,
							"Content-Type": 'application/x-www-form-urlencoded'
						},
					});
					
					if (zoomRes.status !== 200) {
						return 'error'
					}
	
					const zoomData: any = zoomRes.data
	
					const eOn = new Date()
					eOn.setSeconds(eOn.getSeconds() + (Number.isNaN(Number(zoomData.expires_in)) ? 0 : Number(zoomData.expires_in)))
	
					accessToken = zoomData.access_token
	
					await UserModel.updateOne({ _id: userId }, {
						zoomInfo: {
							...user.zoomInfo,
							accessToken: zoomData.access_token,
							refreshToken: zoomData.refresh_token,
							expiresOn: eOn	// saved as a date
						}
					})
	
				}

				console.log("Access token", accessToken)
	
				const zoomRes: any = await axios.post(
					`https://zoom.us/oauth/revoke?token=${accessToken}`,
					undefined, {
					headers: {
						Authorization: `Basic ${b.toString("base64")}`,
						"Content-Type": 'application/x-www-form-urlencoded'
					},
				});
	
				console.log("Zoom res", zoomRes);
	
				if (!zoomRes || !zoomRes.data) {
					return false;
				}
	
				const zoomData: any = zoomRes.data
	
				if (zoomData.status === "success") {
					return true;
				}
	
	
				return false;
			}
	
			return false;
		} catch (e) {
			console.log("Error", e)
			return false;
		}
	}

	@Field(type => ZoomObject, { nullable: true })
	public async connectZoom(
		@Arg("userId", (type) => String)
		userId: string,
		@Arg("code", (type) => String)
		code: string
	) {
		try {

			const b = Buffer.from(zoomClientId + ":" + zoomClientSecret);

			const zoomRes: any = await axios.post(`https://zoom.us/oauth/token?grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(zoomRedirectUri)}`, undefined, {
				headers: {
					Authorization: `Basic ${b.toString("base64")}`,
					"Content-Type": 'application/x-www-form-urlencoded'
				},
			});
			if (zoomRes.status !== 200) {
				return null
			}

			const zoomData: any = zoomRes.data
			// Retreive user details
			const zoomUserRes: any = await axios.get("https://api.zoom.us/v2/users/me", {
				headers: {
					Authorization: `Bearer ${zoomData.access_token}`,
				}
			});

			const zoomUserData: any = zoomUserRes.data
			const expiresOn = new Date()
			expiresOn.setSeconds(expiresOn.getSeconds() + (Number.isNaN(Number(zoomUserData.expires_in)) ? 0 : Number(zoomUserData.expires_in)))

			const zoomInfo = {
				email: zoomUserData.email,
				accountId: zoomUserData.account_id,
				accessToken: zoomData.access_token,
				refreshToken: zoomData.refresh_token,
				expiresOn,
				accountType: zoomData.type
			}

			await UserModel.updateOne({ _id: userId }, {
				zoomInfo
			})

			return zoomInfo;
		} catch (e) {
			console.log(e);
			return null;
		}
	}

}
