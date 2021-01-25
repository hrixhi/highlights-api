import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { ChannelObject } from './types/Channel.type';
import { ChannelModel } from './mongo/Channel.model';

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

}