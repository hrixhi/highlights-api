import { Arg, Field, ObjectType } from "type-graphql";
import { DateModel } from "./mongo/dates.model";
import { nanoid } from "nanoid";
import { ChannelModel } from "../channel/mongo/Channel.model";
import { SubscriptionModel } from "../subscription/mongo/Subscription.model";
import { UserModel } from "../user/mongo/User.model";

import * as OneSignal from "onesignal-node";
import Expo from "expo-server-sdk";
import { ActivityModel } from "../activity/mongo/activity.model";

/**
 * Date Mutation Endpoints
 */
@ObjectType()
export class DateMutationResolver {
	@Field((type) => Boolean, {
		description: "Used when you want to update unread messages count.",
	})
	public async create(
		@Arg("userId", (type) => String) userId: string,
		@Arg("title", (type) => String) title: string,
		@Arg("start", (type) => String) start: string,
		@Arg("end", (type) => String) end: string,
		@Arg("channelId", (type) => String, { nullable: true }) channelId?: string
	) {
		try {
			await DateModel.create({
				userId: channelId && channelId !== "" ? undefined : userId,
				title,
				start: new Date(start),
				end: new Date(end),
				isNonMeetingChannelEvent: channelId && channelId !== "" ? true : false,
				scheduledMeetingForChannelId:
					channelId && channelId !== "" ? channelId : undefined,
			});
			return true;
		} catch (e) {
			return false;
		}
	}

	@Field((type) => Boolean, {
		description: "Used when you want to update unread messages count.",
	})
	public async createV1(
		@Arg("userId", (type) => String) userId: string,
		@Arg("title", (type) => String) title: string,
		@Arg("start", (type) => String) start: string,
		@Arg("end", (type) => String) end: string,
		@Arg("channelId", (type) => String, { nullable: true }) channelId?: string,
		@Arg("meeting", (type) => Boolean, { nullable: true }) meeting?: boolean,
		@Arg("description", (type) => String, { nullable: true })
		description?: string,
		@Arg("recordMeeting", (type) => Boolean, { nullable: true })
		recordMeeting?: boolean,
		@Arg("frequency", (type) => String, { nullable: true }) frequency?: string,
		@Arg("repeatTill", (type) => String, { nullable: true }) repeatTill?: string
	) {
		try {
			// isNonMeetingChannelEvent is set to undefined to differentiate meetings from events

			if (repeatTill && frequency) {
				// Construct dates for creating and set a recurring Id
				const dates = this.getAllDates(start, frequency, repeatTill);

				const recurringId = nanoid();

				for (let i = 0; i < dates.length; i++) {
					const scheduledDate = dates[i];

					const startDate = new Date(start);

					const endDate = new Date(end);

					// Update start and end date to Scheduled Date
					startDate.setDate(scheduledDate.getDate());
					startDate.setMonth(scheduledDate.getMonth());

					endDate.setDate(scheduledDate.getDate());
					endDate.setMonth(scheduledDate.getMonth());

					console.log({
						userId: channelId && channelId !== "" ? undefined : userId,
						title,
						start: startDate,
						end: endDate,
						isNonMeetingChannelEvent: !meeting
							? channelId && channelId !== ""
								? true
								: false
							: undefined,
						scheduledMeetingForChannelId:
							channelId && channelId !== "" ? channelId : undefined,
						description,
						recordMeeting,
						recurringId,
					});

					await DateModel.create({
						userId: channelId && channelId !== "" ? undefined : userId,
						title,
						start: startDate,
						end: endDate,
						isNonMeetingChannelEvent: !meeting
							? channelId && channelId !== ""
								? true
								: false
							: undefined,
						scheduledMeetingForChannelId:
							channelId && channelId !== "" ? channelId : undefined,
						description,
						recordMeeting,
						recurringId,
					});
				}
			} else {
				console.log({
					userId: channelId && channelId !== "" ? undefined : userId,
					title,
					start: new Date(start),
					end: new Date(end),
					isNonMeetingChannelEvent: !meeting
						? channelId && channelId !== ""
							? true
							: false
						: undefined,
					scheduledMeetingForChannelId:
						channelId && channelId !== "" ? channelId : undefined,
					description,
					recordMeeting,
				});
				await DateModel.create({
					userId: channelId && channelId !== "" ? undefined : userId,
					title,
					start: new Date(start),
					end: new Date(end),
					isNonMeetingChannelEvent: !meeting
						? channelId && channelId !== ""
							? true
							: false
						: undefined,
					scheduledMeetingForChannelId:
						channelId && channelId !== "" ? channelId : undefined,
					description,
					recordMeeting,
				});
			}

			// IF no channel just return

			if (!channelId) return true;

			// Notifications
			const messages: any[] = [];
			const userIds: any[] = [];

			const subscriptions = await SubscriptionModel.find({
				$and: [{ channelId }, { unsubscribedAt: { $exists: false } }],
			});
			subscriptions.map((s) => {
				userIds.push(s.userId);
			});

			const channel: any = await ChannelModel.findById(channelId);
			const users: any[] = await UserModel.find({ _id: { $in: userIds } });

			// Web notifications

			const oneSignalClient = new OneSignal.Client(
				"51db5230-f2f3-491a-a5b9-e4fba0f23c76",
				"Yjg4NTYxODEtNDBiOS00NDU5LTk3NDItZjE3ZmIzZTVhMDBh"
			);

			const notification = {
				contents: {
					en: `${channel.name}` + " - New event Scheduled " + title,
				},
				include_external_user_ids: userIds,
			};

			const response = await oneSignalClient.createNotification(notification);

			const activity: any[] = []
			users.map((sub) => {
				const notificationIds = sub.notificationId.split("-BREAK-");
				notificationIds.map((notifId: any) => {
					if (!Expo.isExpoPushToken(notifId)) {
						return;
					}
					messages.push({
						to: notifId,
						sound: "default",
						subtitle: "Your instructor has scheduled a new event.",
						title: channel.name + " - New event Scheduled" + title,
						data: { userId: sub._id },
					});
				});
				activity.push({
					userId: sub._id,
					subtitle: 'Your instructor has scheduled a new event.',
					title: 'New event Scheduled',
					status: 'unread',
					date: new Date(),
					channelId
				})
			});
			await ActivityModel.insertMany(activity)

			const notificationService = new Expo();
			let chunks = notificationService.chunkPushNotifications(messages);
			for (let chunk of chunks) {
				try {
					await notificationService.sendPushNotificationsAsync(chunk);
				} catch (e) {
					console.error(e);
				}
			}

			return true;
		} catch (e) {
			return false;
		}
	}

	@Field((type) => Boolean, {
		description: "Used when you want to update unread messages count.",
	})
	public async editV1(
		@Arg("id", (type) => String) id: string,
		@Arg("title", (type) => String) title: string,
		@Arg("start", (type) => String) start: string,
		@Arg("end", (type) => String) end: string,
		@Arg("description", (type) => String, { nullable: true })
		description?: string,
		@Arg("recordMeeting", (type) => Boolean, { nullable: true })
		recordMeeting?: boolean
	) {
		try {
			const update = await DateModel.updateOne(
				{ _id: id },
				{
					title,
					start: new Date(start),
					end: new Date(end),
					description,
					recordMeeting,
				}
			);
			//return true;
			//return update.modifiedCount > 0;
			return update.nModified > 0;
		} catch (e) {
			console.log(e);
			return false;
		}
	}

	@Field((type) => [Date], {
		description: "Used when you want to delete a date.",
	})
	private getAllDates(
		@Arg("start", (type) => String) start: string,
		@Arg("frequency", (type) => String) frequency: string,
		@Arg("repeatTill", (type) => String) repeatTill: string
	) {
		const currentDate = new Date(start);

		let loopDate = currentDate;

		const endDate = new Date(repeatTill);

		let dates = [];

		while (loopDate <= endDate) {
			// New Date to prevent same Object ref
			dates.push(new Date(loopDate));

			switch (frequency) {
				case "1-W":
					loopDate.setDate(loopDate.getDate() + 7);
					break;
				case "2-W":
					loopDate.setDate(loopDate.getDate() + 14);
					break;
				case "1-M":
					loopDate.setMonth(loopDate.getMonth() + 1);
					break;
				case "2-M":
					loopDate.setMonth(loopDate.getMonth() + 2);
					break;
				case "3-M":
					loopDate.setMonth(loopDate.getMonth() + 3);
					break;
			}
		}

		return dates;
	}

	@Field((type) => Boolean, {
		description: "Used when you want to delete a date.",
	})
	public async deleteV1(
		@Arg("id", (type) => String) id: string,
		@Arg("deleteAll", (type) => Boolean) deleteAll: boolean
	) {
		try {
			console.log(id);
			if (deleteAll) {
				await DateModel.deleteMany({ recurringId: id });
			} else {
				await DateModel.deleteOne({ _id: id });
			}

			return true;
		} catch (e) {
			return false;
		}
	}

	@Field((type) => Boolean, {
		description: "Used when you want to delete a date.",
	})
	public async delete(@Arg("dateId", (type) => String) dateId: string) {
		try {
			await DateModel.deleteOne({ _id: dateId });
			return true;
		} catch (e) {
			return false;
		}
	}
}
