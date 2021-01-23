import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { ChannelObject } from './types/Channel.type';
import { ChannelModel } from './mongo/Channel.model';

/**
 * Channel Query Endpoints
 */
@ObjectType()
export class ChannelQueryResolver {

  @Field(type => ChannelObject, {
    description: "Used to find one user by id.",
    nullable: true
  })
  public async findById(
    @Arg("id", type => String)
    id: string
  ) {
    const result: any = await ChannelModel.findById(id);
    return result;
  }

}