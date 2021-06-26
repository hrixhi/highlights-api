import { Arg, Field, ObjectType } from "type-graphql";
import { ChannelObject } from "./types/Channel.type";
import { ChannelModel } from "./mongo/Channel.model";
import { CueModel } from "../cue/mongo/Cue.model";
import { ModificationsModel } from "../modification/mongo/Modification.model";
import { UserModel } from "../user/mongo/User.model";
import { GradeObject } from "../modification/types/Modification.type";
import { CueObject } from "../cue/types/Cue.type";
import { GroupModel } from "../group/mongo/Group.model";

/**
 * Channel Query Endpoints
 */
@ObjectType()
export class ChannelQueryResolver {
    @Field(type => [ChannelObject], {
        description: "Returns list of channels created by a user.",
        nullable: true
    })
    public async findByUserId(
        @Arg("userId", type => String)
        userId: string
    ) {
        try {
            return await ChannelModel.find({
                createdBy: userId,
                creatorUnsubscribed: { $ne: true }
            });
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field(type => String, {
        description:
            'Returns "private", "public", "non-existant" statuses for a channel'
    })
    public async getChannelStatus(@Arg("name", type => String) name: string) {
        try {
            const channel = await ChannelModel.findOne({ name });
            if (channel) {
                if (channel.password && channel.password !== "") {
                    return "private";
                } else {
                    return "public";
                }
            } else {
                return "non-existant";
            }
        } catch (e) {
            return "non-existant";
        }
    }

    @Field(type => [String], {
        description: "Returns list of channel categories."
    })
    public async getChannelCategories(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {
            const channelCues = await CueModel.find({
                channelId
            });
            const categoryObject: any = {};
            channelCues.map((item: any) => {
                if (item.customCategory && item.customCategory !== "") {
                    if (!categoryObject[item.customCategory]) {
                        categoryObject[item.customCategory] = "category";
                    }
                }
            });
            const categoryArray: string[] = [];
            Object.keys(categoryObject).map((key: string) => {
                categoryArray.push(key);
            });
            return categoryArray;
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field(type => String, {
        description: "Returns meeting link."
    })
    public async getMeetingLink(
        @Arg("channelId", type => String)
        channelId: string,
        @Arg("userId", type => String)
        userId: string
    ) {
        try {
            const u: any = await UserModel.findById(userId);
            const c: any = await ChannelModel.findById(channelId);
            if (u && c) {
                const user = u.toObject();
                const channel = c.toObject();
                const sha1 = require("sha1");
                const vdoURL = "https://my1.vdo.click/bigbluebutton/api/";
                const vdoKey = "bLKw7EqEyEoUvigSbkFr7HDdkzofdbtxakwfccl1VrI";
                const atendeePass = channelId;
                const modPass = channel.createdBy;
                const fullName = encodeURIComponent(encodeURI(user.displayName.replace(/[^a-z0-9]/gi, '').split(' ').join('').trim()))
                const params =
                    "fullName=" +
                    (fullName.length > 0 ? fullName : Math.floor(Math.random() * (999 - 100 + 1) + 100).toString()) +
                    "&meetingID=" +
                    channelId +
                    "&password=" +
                    (channel.createdBy.toString().trim() ===
                        user._id.toString().trim()
                        ? modPass
                        : atendeePass);
                const toHash = "join" + params + vdoKey;
                const checksum = sha1(toHash);
                return vdoURL + "join?" + params + "&checksum=" + checksum;
            } else {
                return "error";
            }
        } catch (e) {
            return "error";
        }
    }

    @Field(type => String, {
        description: "Returns meeting link."
    })
    public async getPersonalMeetingLink(
        @Arg("users", type => [String])
        users: string[],
        @Arg("userId", type => String)
        userId: string
    ) {
        try {
            const u: any = await UserModel.findById(userId);
            const groupDoc: any = await GroupModel.findOne({
                users: { $all: users }
            });
            const groupId = groupDoc._id
            if (u) {
                const user = u.toObject();
                const sha1 = require("sha1");
                const vdoURL = "https://my1.vdo.click/bigbluebutton/api/";
                const vdoKey = "bLKw7EqEyEoUvigSbkFr7HDdkzofdbtxakwfccl1VrI";
                const fullName = encodeURIComponent(encodeURI(user.displayName.replace(/[^a-z0-9]/gi, '').split(' ').join('').trim()))
                const params =
                    "fullName=" +
                    (fullName.length > 0 ? fullName : Math.floor(Math.random() * (999 - 100 + 1) + 100).toString()) +
                    "&meetingID=" +
                    groupId +
                    "&password=" + groupId
                const toHash = "join" + params + vdoKey;
                const checksum = sha1(toHash);
                return vdoURL + "join?" + params + "&checksum=" + checksum;
            } else {
                return "error";
            }
        } catch (e) {
            return "error";
        }
    }

    @Field(type => Boolean, {
        description: "Returns meeting link status."
    })
    public async getPersonalMeetingLinkStatus(
        @Arg("users", type => [String])
        users: string[]
    ) {
        try {
            const groupDoc: any = await GroupModel.findOne({
                users: { $all: users }
            });
            if (groupDoc) {
                const group = groupDoc.toObject()
                if (group && group.meetingOn) {
                    return true
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    @Field(type => [CueObject], {
        description: "Returns a list of submission cues."
    })
    public async getSubmissionCues(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {
            return await CueModel.find({ channelId, submission: true });
        } catch (e) {
            return [];
        }
    }

    @Field(type => [GradeObject], {
        description: "Returns a list of grade object."
    })
    public async getGrades(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {
            const gradedData: any = await ModificationsModel.find({
                channelId,
                submission: true
            });
            const gradesObject: any = {};
            const userIds: any = [];

            gradedData.map((mod: any) => {
                const modification = mod.toObject();
                if (gradesObject[modification.userId]) {
                    gradesObject[modification.userId].push({
                        score: modification.score,
                        gradeWeight: modification.gradeWeight,
                        cueId: modification.cueId,
                        graded: modification.graded
                    });
                } else {
                    userIds.push(modification.userId);
                    gradesObject[modification.userId] = [
                        {
                            score: modification.score,
                            gradeWeight: modification.gradeWeight,
                            cueId: modification.cueId,
                            graded: modification.graded
                        }
                    ];
                }
            });
            const users: any = await UserModel.find({ _id: { $in: userIds } });
            const grades: any[] = [];

            const channel: any = await ChannelModel.findById(channelId);

            // Filter channel owner data out
            const filteredUsers = users.filter((u: any) => {
                const user = u.toObject();
                return user._id.toString() !== channel.createdBy.toString();
            });

            filteredUsers.map((u: any) => {
                const user = u.toObject();
                grades.push({
                    userId: user._id,
                    displayName: user.displayName,
                    fullName: user.fullName,
                    email: user.email && user.email !== "" ? user.email : "",
                    scores: gradesObject[user._id] ? gradesObject[user._id] : []
                });
            });
            return grades;
        } catch (e) {
            return [];
        }
    }

    @Field(type => Boolean, {
        description: "Returns status of channel meeting."
    })
    public async getMeetingStatus(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {
            const c = await ChannelModel.findById(channelId);
            if (c) {
                const channel = c.toObject();
                return channel.meetingOn ? channel.meetingOn : false;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    @Field(type => Boolean, {
        description: "Returns true if channel name exists."
    })
    public async doesChannelNameExist(
        @Arg("name", type => String)
        name: string
    ) {
        try {
            const channel = await ChannelModel.findOne({ name });
            if (channel) {
                return true;
            } else {
                return false;
            }
        } catch (e) {
            return false;
        }
    }
}
