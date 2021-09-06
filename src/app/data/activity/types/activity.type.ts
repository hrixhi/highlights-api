import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';

@ObjectType()
export class ActivityObject {

  @Field()
  public _id: string;

  @Field()
  public userId: string;

  @Field()
  public title: string;

  @Field()
  public subtitle: string;

  @Field({ nullable: true })
  public body?: string;

  @Field()
  public status: string;

  @Field()
  public channelId: string;

  @Field({ nullable: true })
  public cueId?: string;

  @Field(type => Date)
  public date: Date;

  @Field(type => String, { nullable: true })
  public async channelName() {
    const localThis: any = this;
    const { channelId } = localThis._doc || localThis;
    if (channelId) {
      const channel = await ChannelModel.findById(channelId)
      return channel ? channel.name : ''
    } else {
      return ''
    }
  }

  @Field(type => String, { nullable: true })
  public async colorCode() {
    const localThis: any = this;
    const { channelId } = localThis._doc || localThis;
    if (channelId) {
      const channel = await ChannelModel.findById(channelId)
      return channel ? channel.colorCode : ''
    } else {
      return ''
    }
  }


  @Field(type => String)
    public async createdBy(@Ctx() context: IGraphQLContext) {
        const localThis: any = this;
        const { channelId } = localThis._doc || localThis;

        if (channelId) {
          const channel = await ChannelModel.findById(channelId)

          if (channel && context.user) {

            if (channel.owners) {
              const anotherOwner = channel.owners.find((item: any) => {
                return item === context.user!._id.toString()
              })

              if (anotherOwner) {
                return anotherOwner
              }
            } else {
              return channel.createdBy
            }
            
          } 

          return '';
        } else {
          return ''
        }
    }

  @Field(type => String, { nullable: true})
  public target?: String;

}