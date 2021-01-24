import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { CueObject } from './types/Cue.type';
import { CueModel } from './mongo/Cue.model';
import { StatusModel } from '../status/mongo/Status.model';

/**
 * Log Query Endpoints
 */
@ObjectType()
export class CueQueryResolver {

  @Field(type => [CueObject], {
    description: "Used to find one user by id."
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
    description: "Used to find one user by id."
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

}