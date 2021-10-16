import { Field, ObjectType } from "type-graphql";
import { UserObject } from "./User.type";

@ObjectType()
export class AuthResponseObject {
  @Field(type => UserObject, { nullable: true })
  public user?: UserObject;

  @Field(type => String)
  public error: String;

  @Field(type => String, { nullable: true })
  public token: string;
}
