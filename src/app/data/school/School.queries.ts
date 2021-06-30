import { Arg, Field, ObjectType } from 'type-graphql';
import { SchoolsModel } from './mongo/School.model';
import { SchoolObject } from './types/School.type';

/**
 * School Query Endpoints
 */
@ObjectType()
export class SchoolQueryResolver {

    @Field(type => SchoolObject, {
        description: "Used to retrieve school",
        nullable: true
    })
    public async findById(
        @Arg("schoolId", type => String)
        schoolId: string
    ) {
        try {
            return await SchoolsModel.findById(schoolId)
        } catch (e) {
            console.log(e)
            return null
        }
    }

}