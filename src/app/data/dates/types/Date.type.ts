import { AttendanceModel } from '@app/data/attendance/mongo/attendance.model';
import { AttendanceObject } from '@app/data/attendance/types/Attendance.type';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class EventObject {

  @Field()
  public title: string;

  @Field()
  public start: Date;

  @Field()
  public end: Date;

  @Field(type => String, { nullable: true })
  public channelName?: string;

  @Field(type => String, { nullable: true })
  public dateId?: string;

  @Field(type => String, { nullable: true })
  public scheduledMeetingForChannelId?: string;

}