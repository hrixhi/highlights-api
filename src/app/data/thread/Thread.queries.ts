import { Arg, Field, ObjectType } from 'type-graphql';
import { ThreadObject } from './types/Thread.type';
import { ThreadModel } from './mongo/Thread.model';

/**
 * Thread Query Endpoints
 */
@ObjectType()
export class ThreadQueryResolver {

  @Field(type => [ThreadObject], {
    description: "Returns parent threads for general discussion.",
  })
  public async findByChannelId(
    @Arg("channelId", type => String)
    channelId: string
  ) {
    try {
      return await ThreadModel.find({ channelId, parentId: null, cueId: null })
    } catch (e) {
      console.log(e)
      return []
    }
  }

  @Field(type => [ThreadObject], {
    description: "Returns parent threads for cue discussion.",
  })
  public async findByCueId(
    @Arg("cueId", type => String)
    cueId: string
  ) {
    try {
      return await ThreadModel.find({ cueId, parentId: null })
    } catch (e) {
      console.log(e)
      return []
    }
  }

  @Field(type => [ThreadObject], {
    description: "Returns threads posted by a user.",
  })
  public async findByUserId(
    @Arg("userId", type => String)
    userId: string
  ) {
    try {
      return await ThreadModel.find({
        userId
      })
    } catch (e) {
      console.log(e)
      return []
    }
  }

  @Field(type => [ThreadObject], {
    description: "Returns full list of threads.",
  })
  public async getThreadWithReplies(
    @Arg("threadId", type => String)
    threadId: string
  ) {
    try {
      const parent = await ThreadModel.findById(threadId)
      if (parent) {
        const replies: any[] = await ThreadModel.find({ parentId: threadId })
        const list = [parent, ...replies]
        return list
      } else {
        return []
      }
    } catch (e) {
      console.log(e)
      return []
    }
  }

  @Field(type => [String], {
    description: "Returns list of thread categories.",
  })
  public async getChannelThreadCategories(
    @Arg("channelId", type => String)
    channelId: string
  ) {
    try {
      const channelThreads = await ThreadModel.find({
        channelId, cueId: null, parentId: null
      })
      const categoryObject: any = {}
      channelThreads.map((item: any) => {
        if (item.category && item.category !== '') {
          if (!categoryObject[item.category]) {
            categoryObject[item.category] = 'category'
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

}