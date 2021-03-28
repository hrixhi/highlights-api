import { Arg, Field, ObjectType } from 'type-graphql';
import { CueObject } from './types/Cue.type';
import { CueModel } from './mongo/Cue.model';
import { StatusModel } from '../status/mongo/Status.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { SharedWithObject } from './types/SharedWith';

/**
 * Cue Query Endpoints
 */
@ObjectType()
export class CueQueryResolver {

  @Field(type => [CueObject], {
    description: "Returns list of cues by channel.",
  })
  public async findByChannelId(
    @Arg("channelId", type => String)
    channelId: string
  ) {
    const result: any = await CueModel.find({
      channelId
    });
    return result;
  }

  @Field(type => [CueObject], {
    description: "Returns list of unread cues by channel."
  })
  public async findUnreadByChannelId(
    @Arg("channelId", type => String)
    channelId: string,
    @Arg("userId", type => String)
    userId: string
  ) {

    const unreadCueIds = await StatusModel.find({ status: { $ne: 'read' }, channelId, userId })
    const ids: any[] = []
    unreadCueIds.map((item) => {
      ids.push(item.cueId)
    })
    const result: any = await CueModel.find({ _id: { $in: ids } });
    return result;
  }

  @Field(type => [CueObject], {
    description: "Returns list of cues created by a user.",
  })
  public async findByUserId(
    @Arg("userId", type => String)
    userId: string
  ) {
    try {
      return await ModificationsModel.find({ userId })
    } catch (e) {
      return []
    }
  }

  @Field(type => [CueObject], {
    description: "Returns list of cues created by a user.",
  })
  public async getCuesFromCloud(
    @Arg("userId", type => String)
    userId: string
  ) {
    try {
      const localCues: any[] = await CueModel.find({
        createdBy: userId,
        channelId: null
      })
      const channelCues: any[] = await ModificationsModel.find({
        userId
      })
      const allCues: any[] = [...localCues, ...channelCues]
      return allCues
    } catch (e) {
      console.log(e)
      return []
    }
  }

  @Field(type => [SharedWithObject], {
    description: "Returns list of people who have received the cue.",
  })
  public async getSharedWith(
    @Arg("channelId", type => String)
    channelId: string,
    @Arg("cueId", type => String, { nullable: true })
    cueId?: string
  ) {
    try {
      const subscribers = await SubscriptionModel.find({
        channelId, unsubscribedAt: { $exists: false }
      })
      const modifications = cueId ? await ModificationsModel.find({ cueId }) : []
      const sharedWith: any[] = [];
      subscribers.map((s) => {
        const sub = s.toObject()
        const mod = modifications.find((m) => m.userId.toString().trim() === sub.userId.toString().trim())
        sharedWith.push({
          value: sub.userId,
          isFixed: mod ? true : false
        })
      })
      return sharedWith
    } catch (e) {
      console.log(e)
      return []
    }
  }

}