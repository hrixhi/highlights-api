import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class FolderObject {

  @Field(type => [String])
  public cueIds: string[];

}