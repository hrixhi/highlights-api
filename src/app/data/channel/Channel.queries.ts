import { Arg, Field, ObjectType } from "type-graphql";
import { ChannelObject } from "./types/Channel.type";
import { ChannelModel } from "./mongo/Channel.model";
import { CueModel } from "../cue/mongo/Cue.model";
import { ModificationsModel } from "../modification/mongo/Modification.model";
import { UserModel } from "../user/mongo/User.model";
import { GradeObject } from "../modification/types/Modification.type";
import { CueObject } from "../cue/types/Cue.type";
import { SubmissionStatisticObject } from "./types/SubmissionStatistic.type";
import { GroupModel } from "../group/mongo/Group.model";

import * as ss from "simple-statistics";
import { LectureRecording } from "../dates/types/Date.type";

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
                $or: [{
                    createdBy: userId,
                }, {
                    owners: userId,
                }],
                creatorUnsubscribed: { $ne: true }
            });
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field(type => ChannelObject, {
        description: "Returns channel by id.",
        nullable: true
    })
    public async findById(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {
            return await ChannelModel.findById(channelId)
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    @Field(type => [ChannelObject], {
        description: "Returns list of channels belonging to channel.",
        nullable: true
    })
    public async findBySchoolId(
        @Arg("schoolId", type => String)
        schoolId: string
    ) {
        try {
            const users = await UserModel.find({ schoolId })
            const userIds: any[] = []
            users.map((u: any) => {
                userIds.push(u._id)
            })

            const channels = await ChannelModel.find({
                createdBy: { $in: userIds },
                creatorUnsubscribed: { $ne: true }
            })

            return channels
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
        description: "Returns meeting link that can be shared."
    })
    public async getSharableLink(
        @Arg("channelId", type => String)
        channelId: string,
        @Arg("moderator", type => Boolean)
        moderator: boolean
    ) {
        try {
            const c: any = await ChannelModel.findById(channelId);
            if (c) {
                const channel = c.toObject();
                const sha1 = require("sha1");
                const vdoURL = "https://my1.vdo.click/bigbluebutton/api/";
                const vdoKey = "bLKw7EqEyEoUvigSbkFr7HDdkzofdbtxakwfccl1VrI";
                const atendeePass = channelId;
                const modPass = channel.createdBy;
                const fullName = moderator ? 'instructor' : 'guest'
                const params =
                    "fullName=" + fullName +
                    "&meetingID=" + channelId +
                    "&password=" + (moderator
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

    @Field(type => String, {
        description: "Returns a list of submission cues."
    })
    public async getChannelColorCode(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {
            const channel = await ChannelModel.findById(channelId);
            if (channel && channel.colorCode !== undefined && channel.colorCode !== null) {
                return channel.colorCode
            } else {
                return ""
            }
        } catch (e) {
            return "";
        }
    }

    @Field(type => [SubmissionStatisticObject], {
        description: "Returns a list of submission cues."
    })
    public async getSubmissionCuesStatistics(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {
            // const submissionCues = await CueModel.find({ channelId, submission: true });

            const gradedData: any = await ModificationsModel.find({
                channelId,
                submission: true
            });


            // Construct the total statistics - Minimum, Median, Maximum, Mean, STD Deviation

            // Need an array of scores for all the submission Cues

            // test with channel id 60ab11233e057c171516eea4


            let cueScores: any = {}

            gradedData.forEach((mod: any) => {
                const modification = mod.toObject();

                if (modification.score !== undefined) {
                    if (cueScores[modification.cueId]) {
                        cueScores[modification.cueId].push(modification.score)
                    } else {
                        cueScores[modification.cueId] = [modification.score]
                    }
                }

            })

            let statistics: any[] = [];

            const cues = Object.keys(cueScores)

            for (let i = 0; i < cues.length; i++) {

                let cueId = cues[i];

                const scores = cueScores[cueId];

                const max = ss.max(scores);

                const min = ss.min(scores);

                const mean = ss.mean(scores);

                const median = ss.median(scores);

                const std = ss.standardDeviation(scores);

                const submissionCount = scores.length;

                statistics.push({
                    cueId,
                    max,
                    min,
                    mean: mean.toFixed(1),
                    median: median.toFixed(1),
                    std: std.toFixed(2),
                    submissionCount
                })
            }

            return statistics



        } catch (e) {
            console.log(e)
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

    @Field(type => [LectureRecording], {
        description: "Returns true if channel name exists."
    })
    public async getRecordings(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {

            const axios = require('axios')
            const sha1 = require('sha1');
            const vdoURL = 'https://my1.vdo.click/bigbluebutton/api/'
            const vdoKey = 'bLKw7EqEyEoUvigSbkFr7HDdkzofdbtxakwfccl1VrI'
            let params =
                'meetingID=' + channelId
            const toHash = (
                'getRecordings' + params + vdoKey
            )
            const checkSum = sha1(toHash)
            const url = vdoURL + 'getRecordings?' + params + '&checksum=' + checkSum
            const data = await axios.get(url)

            const xml2js = require('xml2js');
            const parser = new xml2js.Parser();
            const json = await parser.parseStringPromise(data.data);
            const unparsedRecordings = json.response.recordings[0].recording
            if (!unparsedRecordings) {
                return []
            }
            const parsedRecordings: any = []
            unparsedRecordings.map((item: any) => {
                const startTime = new Date(0)
                startTime.setUTCMilliseconds(item.startTime[0])
                const endTime = new Date(0)
                endTime.setUTCMilliseconds(item.endTime[0])
                parsedRecordings.push({
                    recordID: item.recordID[0],
                    startTime,
                    endTime,
                    url: item.playback[0].format[0].url[0],
                    thumbnail: item.playback[0].format[0].preview[0].images[0].image[0]._
                })
            })
            return parsedRecordings;

        } catch (e) {
            console.log(e)
            return [];
        }
    }

    @Field(type => Boolean, {
        description: "Returns true if channel can be deleted/is temporary."
    })
    public async isChannelTemporary(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {
            const c = await ChannelModel.findById(channelId)
            if (c) {
                const channel = c.toObject()
                if (channel.temporary) {
                    return true
                }
            }
            return false
        } catch (e) {
            console.log(e)
            return false
        }

    }

}
