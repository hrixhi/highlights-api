import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
import { StatusModel } from '@app/data/status/mongo/Status.model';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { Ctx, Field, InputType, ObjectType } from 'type-graphql';

@InputType()
export class CueInputObject {

  @Field()
  public _id: string;

  @Field({ nullable: true })
  public cue?: string;

  @Field({ nullable: true })
  public frequency?: string;

  @Field({ nullable: true })
  public date?: string;

  @Field({ nullable: true })
  public starred?: boolean;

  @Field({ nullable: true })
  public shuffle?: boolean;

  @Field({ nullable: true })
  public color?: string;

  @Field({ nullable: true })
  public createdBy?: string;

  @Field({ nullable: true })
  public channelId?: string;

  @Field({ nullable: true })
  public endPlayAt?: string;

  @Field({ nullable: true })
  public customCategory?: string;

}
