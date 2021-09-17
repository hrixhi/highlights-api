import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class FolderObject {

  @Field(type => String)
  public async _id() {
    const localThis: any = this;
    const {  _id } = localThis._doc || localThis;
      return _id
  }
  
  @Field(type => [String])
  public cueIds: string[];

  @Field(type => String, { nullable: true })
  public title?: string;

}