import { Arg, Field, ObjectType } from "type-graphql";
import { ChannelModel } from "./mongo/Channel.model";
import { SubscriptionModel } from "../subscription/mongo/Subscription.model";
import Expo from "expo-server-sdk";
import { UserModel } from "../user/mongo/User.model";
import { htmlStringParser } from "@helper/HTMLParser";
import * as OneSignal from "onesignal-node";
import { DateModel } from "../dates/mongo/dates.model";
import { CueModel } from "../cue/mongo/Cue.model";
import { ModificationsModel } from "../modification/mongo/Modification.model";

/**
 * Channel Mutation Endpoints
 */
@ObjectType()
export class ChannelMutationResolver {
    @Field(type => String, {
        description: "Used when you want to create a channel."
    })
    public async create(
        @Arg("name", type => String) name: string,
        @Arg("createdBy", type => String) createdBy: string,
        @Arg("password", { nullable: true }) password?: string
    ) {
        try {
            // name should be valid
            if (
                name &&
                name.toString().trim() !== "" &&
                name.toString().trim() !== "All" &&
                name.toString().trim() !== "All-Channels"
            ) {
                // check for existing channel
                const exists = await ChannelModel.findOne({
                    name: name.toString().trim()
                });
                if (exists) {
                    return "exists";
                }

                // create channel
                const channel = await ChannelModel.create({
                    name: name.toString().trim(),
                    password,
                    createdBy
                });
                await SubscriptionModel.create({
                    userId: createdBy,
                    channelId: channel._id
                });
                return "created";
            } else {
                return "invalid-name";
            }
        } catch (e) {
            console.log(e);
            return "error";
        }
    }

    @Field(type => Boolean, {
        description:
            "Used when you want to allow or disallow people from joining meeting."
    })
    public async editMeeting(
        @Arg("channelId", type => String) channelId: string,
        @Arg("meetingOn", type => Boolean) meetingOn: boolean
    ) {
        try {
            await ChannelModel.updateOne({ _id: channelId }, { meetingOn });
            const channel: any = await ChannelModel.findById(channelId);

            const axios = require("axios");
            const sha1 = require("sha1");
            const vdoURL = "https://my1.vdo.click/bigbluebutton/api/";
            const vdoKey = "bLKw7EqEyEoUvigSbkFr7HDdkzofdbtxakwfccl1VrI";
            const atendeePass = channelId;
            const modPass: any = channel.createdBy;

            if (!meetingOn) {
                // end meeting on VDO server
                const params =
                    "password=" + modPass + "&meetingID=" + channelId;

                const toHash = "end" + params + vdoKey;
                const checkSum = sha1(toHash);
                axios
                    .get(vdoURL + "end?" + params + "&checksum=" + checkSum)
                    .then((res: any) => {})
                    .catch((err: any) => {
                        console.log(err);
                    });
            } else {
                // create meeting on VDO server
                const params =
                    "allowStartStopRecording=true" +
                    "&attendeePW=" +
                    atendeePass +
                    "&autoStartRecording=false" +
                    "&meetingID=" +
                    channelId +
                    "&moderatorPW=" +
                    modPass +
                    "&name=" +
                    encodeURIComponent(channel.name) +
                    "&record=false";
                const toHash = "create" + params + vdoKey;
                const checkSum = sha1(toHash);
                const url =
                    vdoURL + "create?" + params + "&checksum=" + checkSum;

                axios
                    .get(url)
                    .then(async (res: any) => {
                        const subscribers = await SubscriptionModel.find({
                            channelId,
                            unsubscribedAt: { $exists: false }
                        });
                        const userIds: any[] = [];
                        const messages: any[] = [];
                        const notificationService = new Expo();
                        subscribers.map(u => {
                            userIds.push(u.userId);
                        });

                        // Web notifications

                        const oneSignalClient = new OneSignal.Client(
                            "51db5230-f2f3-491a-a5b9-e4fba0f23c76",
                            "Yjg4NTYxODEtNDBiOS00NDU5LTk3NDItZjE3ZmIzZTVhMDBh"
                        );

                        const notification = {
                            contents: {
                                en:
                                    "The host is now in the meeting! - " +
                                    channel.name
                            },
                            include_external_user_ids: userIds
                        };

                        const response = await oneSignalClient.createNotification(
                            notification
                        );

                        console.log(response);

                        const users = await UserModel.find({
                            _id: { $in: userIds }
                        });
                        users.map(sub => {
                            const notificationIds = sub.notificationId.split(
                                "-BREAK-"
                            );
                            notificationIds.map((notifId: any) => {
                                if (!Expo.isExpoPushToken(notifId)) {
                                    return;
                                }
                                messages.push({
                                    to: notifId,
                                    sound: "default",
                                    subtitle: "The host is now in the meeting!",
                                    title: channel.name + " - Meeting Started",
                                    data: { userId: sub._id }
                                });
                            });
                        });
                        let chunks = notificationService.chunkPushNotifications(
                            messages
                        );
                        for (let chunk of chunks) {
                            try {
                                await notificationService.sendPushNotificationsAsync(
                                    chunk
                                );
                            } catch (e) {
                                console.error(e);
                            }
                        }
                    })
                    .catch((err: any) => {
                        console.log(err);
                    });
            }
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field(type => Boolean, {
        description: "Used when owner wants to set up new password."
    })
    public async update(
        @Arg("channelId", type => String) channelId: string,
        @Arg("name", type => String) name: string,
        @Arg("password", type => String, { nullable: true }) password?: string
    ) {
        try {
            await ChannelModel.updateOne(
                { _id: channelId },
                {
                    name,
                    password: password && password !== "" ? password : undefined
                }
            );
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    @Field(type => Boolean, {
        description: "Used delete Channel using Channel name."
    })
    public async deleteChannel(
        @Arg("channelName", type => String) channelName: string
    ) {
        const channel = await ChannelModel.findOne({
            name: channelName
        });

        if (!channel) return false;

        // Delete all Subscriptions

        const deleted = await SubscriptionModel.deleteMany({
            channelId: channel._id
        });

        // Delete all Channel Dates

        const deleteDates = await DateModel.deleteMany({
            scheduledMeetingForChannelId: channel._id
        });

        // Delete all Cues

        const deleteCues = await CueModel.deleteMany({
            channelId: channel._id
        });

        // Delete all Modifications

        const deleteModifications = await ModificationsModel.deleteMany({
            channelId: channel._id
        });

        // Delete  Channel

        const deleteChannel = await ChannelModel.deleteOne({
            _id: channel._id
        });

        if (deleteChannel.deletedCount > 0) return true;

        return false;
    }
}
