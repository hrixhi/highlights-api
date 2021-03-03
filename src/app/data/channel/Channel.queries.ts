import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { ChannelObject } from './types/Channel.type';
import { ChannelModel } from './mongo/Channel.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { ModificationObject } from '../modification/types/Modification.type';

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

  @Field(type => [ModificationObject], {
    description: "Returns a list of modification object.",
  })
  public async getGrades(
    @Arg("channelId", type => String)
    channelId: string
    // context.userId required here
  ) {
    // return a list of modification objects
    // default by assignment
    // assignment - 
  }

}