import { UserModel } from "@app/data/user/mongo/User.model";
import { Arg, Field, ObjectType } from "type-graphql";
import { hashPassword, verifyPassword } from "../methods";
import { SchoolsModel } from "../school/mongo/School.model";
import { SubscriptionModel } from "../subscription/mongo/Subscription.model";
import { UserObject } from "./types/User.type";
import { AuthResponseObject } from "./types/AuthResponse.type";
import { CueModel } from "../cue/mongo/Cue.model";
import { ModificationsModel } from "../modification/mongo/Modification.model";
import { PerformanceObject } from "./types/Performance.type";
import { MessageModel } from "../message/mongo/Message.model";
import { ChannelModel } from "../channel/mongo/Channel.model";
import { GroupModel } from "../group/mongo/Group.model";
import { ThreadModel } from "../thread/mongo/Thread.model";

/**
 * User Query Endpoints
 */
@ObjectType()
export class UserQueryResolver {
  @Field(type => UserObject, {
    description: "Returns a user by id.",
    nullable: true
  })
  public async findById(
    @Arg("id", type => String)
    id: string
  ) {
    const result: any = await UserModel.findById(id);
    return result;
  }

  @Field(type => String, {
    description: "Returns a user role.",
    nullable: true
  })
  public async getRole(
    @Arg("userId", type => String)
    userId: string
  ) {
    const u: any = await UserModel.findById(userId);
    if (u) {
      const user = u.toObject()
      if (user.role && user.role !== '') {
        return user.role
      }
    }
    return '';
  }

  @Field(type => [UserObject], {
    description: "Returns list of users by channelId."
  })
  public async findByChannelId(
    @Arg("channelId", type => String)
    channelId: string
  ) {
    try {
      const subscriptions = await SubscriptionModel.find({
        $and: [{ channelId }, { unsubscribedAt: { $exists: false } }]
      });
      const ids: any[] = [];
      subscriptions.map(subscriber => {
        ids.push(subscriber.userId);
      });
      return await UserModel.find({ _id: { $in: ids }, deletedAt: undefined });
    } catch (e) {
      console.log(e);
      return [];
    }
  }

  @Field(type => AuthResponseObject)
  public async login(
    @Arg("email", type => String)
    email: string,
    @Arg("password", type => String)
    password: string
  ) {
    try {
      const user: any = await UserModel.findOne({ email });
      if (user) {

        if (user.deletedAt) {
          return {
            user: null,
            error: "User account terminated by school administrator."
          };
        }

        if (user.inactive) {
          return {
            user: null,
            error: "Account inactive. Contact school administrator."
          };
        }

        const passwordCorrect = await verifyPassword(password, user.password);
        if (passwordCorrect) {
          await UserModel.updateOne({ _id: user._id }, { lastLoginAt: new Date() })
          return {
            user,
            error: ""
          };
        } else {
          return {
            user: null,
            error: "Incorrect Password. Try again."
          };
        }
      } else {
        return {
          user: null,
          error: "No user found with this email."
        };
      }
    } catch (e) {
      return {
        user: null,
        error: "Something went wrong. Try again."
      };
    }
  }

  @Field(type => [UserObject])
  public async getSchoolUsers(
    @Arg("schoolId", type => String)
    schoolId: string
  ) {
    try {
      const users = await UserModel.find({ schoolId, deletedAt: undefined });
      return users;
    } catch (e) {
      return [];
    }
  }

  @Field(type => String)
  public async organisationLogin(
    @Arg("name", type => String)
    name: string,
    @Arg("password", type => String)
    password: string
  ) {
    try {
      const unhashedPasswordFound = await SchoolsModel.findOne({
        name,
        password
      });
      if (unhashedPasswordFound) {
        const hash = await hashPassword(password);
        await SchoolsModel.updateOne(
          { _id: unhashedPasswordFound._id },
          { password: hash }
        );
        return unhashedPasswordFound._id;
      } else {
        const s: any = await SchoolsModel.findOne({ name });
        if (s) {
          const school = s.toObject();
          const passwordCorrect = await verifyPassword(
            password,
            school.password
          );
          if (passwordCorrect) {
            return school._id;
          }
        }
      }
      return "error";
    } catch (e) {
      return "error";
    }
  }

  @Field(type => [PerformanceObject], {
    description: "Returns total scores.",
    nullable: true
  })
  public async getPerformanceReport(
    @Arg("userId", type => String)
    userId: string
  ) {
    try {
      // channel - score map
      const u: any = await UserModel.findById(userId);
      if (u) {

        const scoreMap: any = {}
        const totalMap: any = {}
        const totalAssessmentsMap: any = {}
        const gradedAssessmentsMap: any = {}
        const lateAssessmentsMap: any = {}
        const submittedAssessmentsMap: any = {}

        const subs = await SubscriptionModel.find({
          $and: [
            { userId },
            { keepContent: { $ne: false } },
            { unsubscribedAt: { $exists: false } }
          ]
        })

        for (let x = 0; x < subs.length; x++) {
          if (subs[x]) {
            const subscription = subs[x].toObject()
            const mods = await ModificationsModel.find({
              channelId: subscription.channelId,
              submission: true,
              userId,
              graded: true,
              releaseSubmission: true
            })


            let score = 0
            let total = 0
            let totalAssessments = 0;
            let gradedAssessments = 0;
            let lateAssessments = 0;
            let submittedAssesments = 0;

            mods.map((m: any) => {
              const mod = m.toObject()
              if (mod.gradeWeight !== undefined && mod.gradeWeight !== null) {
                score += (mod.graded ? (mod.score * mod.gradeWeight / 100) : 0)
                total += mod.gradeWeight
                totalAssessments += 1
                if (mod.graded) {
                  gradedAssessments += 1
                }
                if (mod.submittedAt) {
                  submittedAssesments += 1
                  if (mod.deadline) {
                    const sub = new Date(mod.submittedAt)
                    const dead = new Date(mod.deadline)
                    if (sub > dead) {
                      lateAssessments += 1
                    }
                  }
                }
              }
            })

            scoreMap[subscription.channelId] = total === 0 ? 0 : ((score / total) * 100).toFixed(2).replace(/\.0+$/,'')
            totalMap[subscription.channelId] = total
            totalAssessmentsMap[subscription.channelId] = totalAssessments
            lateAssessmentsMap[subscription.channelId] = lateAssessments
            gradedAssessmentsMap[subscription.channelId] = gradedAssessments
            submittedAssessmentsMap[subscription.channelId] = submittedAssesments
          }
        }

        // total assessments

        const toReturn: any[] = []
        Object.keys(scoreMap).map((key: any) => {
          toReturn.push({
            channelId: key,
            score: scoreMap[key],
            total: totalMap[key],
            totalAssessments: totalAssessmentsMap[key],
            lateAssessments: lateAssessmentsMap[key],
            gradedAssessments: gradedAssessmentsMap[key],
            submittedAssessments: submittedAssessmentsMap[key]
          })
        })

        return toReturn

      } else {
        return []
      }
    } catch (e) {
      console.log(e)
      return []
    }
  }

  @Field(type => [UserObject])
  public async getAllUsers(
    @Arg("userId", type => String)
    userId: string
  ) {
    try {

      const u = await UserModel.findById(userId)
      if (u) {

        const user = u.toObject()
        const subs = await SubscriptionModel.find({
          $and: [
            { userId },
            { keepContent: { $ne: false } },
            { unsubscribedAt: { $exists: false } }
          ]
        })

        const channelIds: any = []
        const userIds: any[] = []
        const userMap: any = {}

        subs.map((s: any) => {
          const sub = s.toObject()
          channelIds.push(sub.channelId)
        })

        const allSubs = await SubscriptionModel.find({
          $and: [
            { channelId: { $in: channelIds } },
            { keepContent: { $ne: false } },
            { unsubscribedAt: { $exists: false } }
          ]
        })

        allSubs.map((s: any) => {
          const sub = s.toObject()
          if (sub.userId.toString().trim() !== userId.toString().trim()) {
            userIds.push(sub.userId)
            if (userMap[sub.userId]) {
              userMap[sub.userId].push(sub.channelId)
            } else {
              userMap[sub.userId] = [sub.channelId]
            }
          }
        })

        const toReturn: any[] = []

        if (user.role === 'instructor') {
          const data = await UserModel.find({
            _id: { $in: userIds },
            schoolId: user.schoolId ? user.schoolId : undefined
          })
          data.map((u: any) => {
            const obj = u.toObject()
            toReturn.push({ ...obj, channelIds: userMap[obj._id] })
          })
        } else {
          const data = await UserModel.find({
            _id: { $in: userIds },
            role: 'instructor',
            schoolId: user.schoolId ? user.schoolId : undefined
          })
          data.map((u: any) => {
            const obj = u.toObject()
            toReturn.push({ ...obj, channelIds: userMap[obj._id] })
          })
        }

        return toReturn

      } else {
        return []
      }

    } catch (e) {
      console.log(e)
      return []
    }
  }

  @Field(type => String)
  public async search(
    @Arg("term", type => String)
    term: string,
    @Arg("userId", type => String)
    userId: string
  ) {
    try {

      // search through cues - messages - threads - channels
      // return result, type, add. data to lead to the result

      const toReturn: any = {}
      const subscriptions = await SubscriptionModel.find({
        $and: [
          { userId },
          { keepContent: { $ne: false } },
          { unsubscribedAt: { $exists: false } }
        ]
      })
      const channelIds = subscriptions.map((s: any) => {
        const sub = s.toObject()
        return (sub.channelId)
      })

      // Channels
      const channels = await ChannelModel.find({ name: new RegExp(term, "i") })
      toReturn['channels'] = channels

      // Cues
      const personalCues = await CueModel.find({
        channelId: { $exists: false },
        createdBy: userId,
        cue: new RegExp(term, "i")
      })
      toReturn['personalCues'] = (personalCues)

      const channelCues = await CueModel.find({
        channelId: { $in: channelIds },
        cue: new RegExp(term, "i")
      })
      toReturn['channelCues'] = (channelCues)

      // Messages
      const groups = await GroupModel.find({
        users: userId
      })
      const groupIds = groups.map((g: any) => {
        const group = g.toObject()
        return group._id

      })

      let groupUsersMap: any = {};

      groups.map((g: any) => {
        const group = g.toObject()
        groupUsersMap[group._id.toString()] = group.users;
      })
      
      const messages = await MessageModel.find({
        message: new RegExp(term, "i"),
        groupId: { $in: groupIds }
      })

      const messagesWithUsers = messages.map((mess: any) => {
        const messObj = mess.toObject();

        const users = groupUsersMap[messObj.groupId.toString()];

        if (users) {
          return {
            ...messObj,
            users
          }
        }

        return {
          ...messObj,
          users: []
        }
      })

      toReturn['messages'] = (messagesWithUsers)

      // Need to add the users to each message 
      

      // threads
      const threads = await ThreadModel.find({
        channelId: { $in: channelIds },
        message: new RegExp(term)
      })
      toReturn['threads'] = (threads)


      // Add createdBy for all the 

      return JSON.stringify(toReturn)

    } catch (e) {
      console.log(e)
      return ''
    }
  }

}
