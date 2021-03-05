import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelObject } from './types/Channel.type';
import { ChannelModel } from './mongo/Channel.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { UserModel } from '../user/mongo/User.model';
import { GradeObject } from '../modification/types/Modification.type';
import { CueObject } from '../cue/types/Cue.type';

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
        createdBy: userId
      });
    } catch (e) {
      console.log(e)
      return []
    }
  }

  @Field(type => String, {
    description: 'Returns "private", "public", "non-existant" statuses for a channel'
  })
  public async getChannelStatus(
    @Arg('name', type => String) name: string
  ) {

    try {
      const channel = await ChannelModel.findOne({ name })
      if (channel) {
        if (channel.password && channel.password !== '') {
          return "private"
        } else {
          return "public"
        }
      } else {
        return "non-existant"
      }
    } catch (e) {
      return "non-existant";
    }

  }

  @Field(type => [String], {
    description: "Returns list of channel categories.",
  })
  public async getChannelCategories(
    @Arg("channelId", type => String)
    channelId: string
  ) {
    try {
      const channelCues = await CueModel.find({
        channelId
      })
      const categoryObject: any = {}
      channelCues.map((item: any) => {
        if (item.customCategory && item.customCategory !== '') {
          if (!categoryObject[item.customCategory]) {
            categoryObject[item.customCategory] = 'category'
          }
        }
      })
      const categoryArray: string[] = []
      Object.keys(categoryObject).map((key: string) => {
        categoryArray.push(key)
      })
      return categoryArray
    } catch (e) {
      console.log(e)
      return []
    }
  }

  @Field(type => [CueObject], {
    description: "Returns a list of submission cues.",
  })
  public async getSubmissionCues(
    @Arg("channelId", type => String)
    channelId: string
  ) {
    try {
      return await CueModel.find({ channelId, submission: true })
    } catch (e) {
      return []
    }
  }

  @Field(type => [GradeObject], {
    description: "Returns a list of grade object.",
  })
  public async getGrades(
    @Arg("channelId", type => String)
    channelId: string
  ) {

    try {
      const gradedData: any = await ModificationsModel.find({ channelId, submission: true })
      const gradesObject: any = {}
      const userIds: any = []

      gradedData.map((mod: any) => {
        const modification = mod.toObject()
        if (gradesObject[modification.userId]) {
          gradesObject[modification.userId].push({
            score: modification.score,
            gradeWeight: modification.gradeWeight,
            cueId: modification.cueId,
            graded: modification.graded
          })
        } else {
          userIds.push(modification.userId)
          gradesObject[modification.userId] = [{
            score: modification.score,
            gradeWeight: modification.gradeWeight,
            cueId: modification.cueId,
            graded: modification.graded
          }]
        }
      })
      const users: any = await UserModel.find({ _id: { $in: userIds } })
      const grades: any[] = []

      users.map((u: any) => {
        const user = u.toObject()
        grades.push({
          userId: user._id,
          displayName: user.displayName,
          fullName: user.fullName,
          email: user.email && user.email !== '' ? user.email : '',
          scores: gradesObject[user._id] ? gradesObject[user._id] : []
        })
      })
      return grades
    } catch (e) {
      return []
    }

  }


}