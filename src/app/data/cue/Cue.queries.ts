import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { CueObject } from './types/Cue.type';
import { CueModel } from './mongo/Cue.model';
import { StatusModel } from '../status/mongo/Status.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';

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
      const channelIds: any[] = []
      const subscriptions = await SubscriptionModel.find({
        $and: [{ userId }, { unsubscribedAt: { $exists: false } }]
      })
      subscriptions.map((item) => {
        channelIds.push(item.channelId)
      })
      return await CueModel.find({ channelId: { $in: channelIds } })
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
      console.log(localCues)
      const channelCues: any[] = await ModificationsModel.find({
        userId
      })
      console.log(channelCues)
      const allCues: any[] = [...localCues, ...channelCues]
      return allCues
    } catch (e) {
      console.log(e)
      return []
    }
  }

}