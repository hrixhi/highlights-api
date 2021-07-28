import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { Ctx, Field, ObjectType } from 'type-graphql';

@ObjectType()
export class SubscriptionObject {

  @Field()
  public _id: string;

  @Field()
  public userId: string;

  @Field()
  public channelId: string;

  @Field(type => String)
  public async channelName() {
    const localThis: any = this;
    const { channelId } = localThis._doc || localThis;
    const channel = await ChannelModel.findById(channelId)
    return channel ? channel.name : ''
  }

  @Field(type => String)
  public async channelCreatedBy(@Ctx() context: IGraphQLContext) {
    const localThis: any = this;
    const { channelId } = localThis._doc || localThis;
    const c = await ChannelModel.findById(channelId)
    if (c) {
      const channel = c.toObject()
      if (channel.owners) {
        console.log(channel.owners)
        console.log(context.user)
        const anotherOwner = channel.owners.find((item: any) => {
          return item.toString().trim() === context.user!._id.toString().trim()
        })
        if (anotherOwner) {
          return anotherOwner
        }
      }
      return channel.createdBy
    }
    return ''
  }

  @Field(type => String)
  public async colorCode(@Ctx() context: IGraphQLContext) {
    const localThis: any = this;
    const { channelId } = localThis._doc || localThis;
    const c = await ChannelModel.findById(channelId)
    if (c) {
      const channel = c.toObject()
      if (channel.colorCode) {
        return channel.colorCode
      } else {
        // If no color code then randomly assign a color code from our list
        const colorChoices = ["#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ff5722", "#795548"]

        const randomColor = colorChoices[Math.floor(Math.random() * colorChoices.length)];

        await ChannelModel.updateOne({
          _id: channelId
        }, {
          colorCode: randomColor
        })
        
        return randomColor;
      }
      
    }
    return ''
  }

  @Field(type => Boolean, { nullable: true })
  public inactive?: boolean;

}